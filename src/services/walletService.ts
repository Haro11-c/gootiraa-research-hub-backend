import { prisma } from '../db/prisma';

export interface WithdrawalParams {
  amountCredits: number;
  channel: 'TELEBIRR' | 'CBE_BANK' | 'CHAPA' | 'BANK_WIRE';
  accountNumber: string;
  accountName: string;
  currency?: 'ETB' | 'USD';
}

export class WalletService {
  /**
   * Retrieves or creates a researcher's wallet
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balanceCredits: 0,
          totalEarnedCredits: 0,
          totalWithdrawnCredits: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Processes reader patronage / tips to a researcher
   */
  async sendTip(senderUserId: string | null, data: {
    receiverUserId: string;
    amountCredits: number;
    publicationId?: string;
    senderName?: string;
    message?: string;
  }) {
    if (data.amountCredits <= 0) {
      throw new Error('Tip amount must be greater than 0 Credits.');
    }

    const receiverWallet = await this.getOrCreateWallet(data.receiverUserId);

    // Update wallet balance atomically
    const updatedWallet = await prisma.wallet.update({
      where: { id: receiverWallet.id },
      data: {
        balanceCredits: { increment: data.amountCredits },
        totalEarnedCredits: { increment: data.amountCredits },
      },
    });

    // Create transaction record
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: receiverWallet.id,
        amountCredits: data.amountCredits,
        type: 'TIP_RECEIVED',
        status: 'COMPLETED',
        description: data.message || `Research patronage tip${data.publicationId ? ' on publication' : ''}`,
        referenceId: data.publicationId,
        senderName: data.senderName || 'Anonymous Scholar',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: senderUserId,
        action: 'WALLET_TIP_SENT',
        entityType: 'WALLET',
        entityId: receiverWallet.id,
        detailsJson: JSON.stringify({
          amount: data.amountCredits,
          receiverId: data.receiverUserId,
          publicationId: data.publicationId,
        }),
      },
    });

    return { wallet: updatedWallet, transaction };
  }

  /**
   * Processes a withdrawal request with automated anti-fraud risk scoring
   */
  async requestWithdrawal(userId: string, params: WithdrawalParams) {
    const MINIMUM_WITHDRAWAL_CREDITS = 1000; // 1,000 RC = 1,000 ETB or $10 USD

    if (params.amountCredits < MINIMUM_WITHDRAWAL_CREDITS) {
      throw new Error(`Minimum payout threshold is ${MINIMUM_WITHDRAWAL_CREDITS} Research Credits (RC).`);
    }

    const [user, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          publications: { where: { status: 'PUBLISHED' } },
        },
      }),
      this.getOrCreateWallet(userId),
    ]);

    if (!user) throw new Error('User not found.');

    // 1. Mandatory Identity / KYC Verification Gate
    if (user.profile?.verifiedStatus !== 'VERIFIED') {
      throw new Error('Institutional verification required. Only ID-verified scholars can request payout to prevent fraud.');
    }

    // 2. Sufficient Balance Check
    if (wallet.balanceCredits < params.amountCredits) {
      throw new Error(`Insufficient wallet balance. You have ${wallet.balanceCredits} RC, requested ${params.amountCredits} RC.`);
    }

    // 3. Automated Fraud Risk Scoring (0 - 100)
    let fraudScore = 10;
    const fraudFlags: string[] = [];

    // Check account age
    const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7) {
      fraudScore += 30;
      fraudFlags.push('NEW_ACCOUNT_UNDER_7_DAYS');
    }

    // Check published output
    if (user.publications.length === 0) {
      fraudScore += 25;
      fraudFlags.push('ZERO_PUBLISHED_WORKS');
    }

    // Large volume request
    if (params.amountCredits >= 10000) {
      fraudScore += 20;
      fraudFlags.push('LARGE_VOLUME_REQUEST');
    }

    // Deduct balance from wallet
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceCredits: { decrement: params.amountCredits },
        totalWithdrawnCredits: { increment: params.amountCredits },
        payoutChannel: params.channel,
        payoutAccountNumber: params.accountNumber,
        payoutAccountName: params.accountName,
      },
    });

    // Create withdrawal request in database
    const currency = params.currency || 'ETB';
    const fiatConversion = currency === 'ETB' ? params.amountCredits * 1.0 : params.amountCredits * 0.01;

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amountCredits: params.amountCredits,
        amountFiat: fiatConversion,
        currency,
        channel: params.channel,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        status: 'PENDING',
        fraudRiskScore: fraudScore,
        fraudFlagsJson: JSON.stringify(fraudFlags),
      },
    });

    // Record transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amountCredits: -params.amountCredits,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        description: `Payout request to ${params.channel} (${params.accountNumber})`,
        referenceId: withdrawal.id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WITHDRAWAL_REQUEST_CREATED',
        entityType: 'WITHDRAWAL',
        entityId: withdrawal.id,
        detailsJson: JSON.stringify({
          amount: params.amountCredits,
          channel: params.channel,
          fraudScore,
          flags: fraudFlags,
        }),
      },
    });

    return withdrawal;
  }

  /**
   * Super Admin: Reviews and approves or rejects a withdrawal request
   */
  async reviewWithdrawal(adminUserId: string, withdrawalId: string, action: 'APPROVED' | 'REJECTED', notes: string) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: { include: { wallet: true } } },
    });

    if (!withdrawal) throw new Error('Withdrawal request not found.');
    if (withdrawal.status !== 'PENDING') {
      throw new Error(`This request is already marked as ${withdrawal.status}.`);
    }

    if (action === 'REJECTED') {
      // Refund credits back to researcher wallet if rejected
      if (withdrawal.user.wallet) {
        await prisma.wallet.update({
          where: { id: withdrawal.user.wallet.id },
          data: {
            balanceCredits: { increment: withdrawal.amountCredits },
            totalWithdrawnCredits: { decrement: withdrawal.amountCredits },
          },
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: withdrawal.user.wallet.id,
            amountCredits: withdrawal.amountCredits,
            type: 'WITHDRAWAL_REFUND',
            status: 'COMPLETED',
            description: `Refund of rejected payout: ${notes}`,
            referenceId: withdrawal.id,
          },
        });
      }
    }

    const updated = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: action,
        reviewedById: adminUserId,
        reviewNotes: notes,
      },
    });

    // Update pending transaction status
    await prisma.walletTransaction.updateMany({
      where: { referenceId: withdrawalId, type: 'WITHDRAWAL' },
      data: { status: action === 'APPROVED' ? 'COMPLETED' : 'REJECTED' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `WITHDRAWAL_${action}`,
        entityType: 'WITHDRAWAL',
        entityId: withdrawalId,
        detailsJson: JSON.stringify({ action, notes, amount: withdrawal.amountCredits }),
      },
    });

    return updated;
  }

  /**
   * Get research bounties
   */
  async getBounties() {
    return prisma.researchBounty.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create research bounty
   */
  async createBounty(data: {
    title: string;
    description: string;
    sponsorName: string;
    sponsorLogoUrl?: string;
    rewardCredits: number;
    rewardFiat?: number;
    currency?: string;
    deadline?: Date | string;
  }) {
    return prisma.researchBounty.create({
      data: {
        title: data.title,
        description: data.description,
        sponsorName: data.sponsorName,
        sponsorLogoUrl: data.sponsorLogoUrl,
        rewardCredits: data.rewardCredits,
        rewardFiat: data.rewardFiat ?? data.rewardCredits * 1.0,
        currency: data.currency ?? 'ETB',
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'OPEN',
      },
    });
  }
}

export const walletService = new WalletService();
