import { Response } from 'express';
import { z } from 'zod';
import { walletService } from '../services/walletService';
import { AuthRequest } from '../middleware/auth';

const tipSchema = z.object({
  receiverUserId: z.string().uuid(),
  amountCredits: z.number().int().positive(),
  publicationId: z.string().optional(),
  senderName: z.string().optional(),
  message: z.string().max(200).optional(),
});

const withdrawalSchema = z.object({
  amountCredits: z.number().int().min(1000, 'Minimum withdrawal is 1,000 Credits'),
  channel: z.enum(['TELEBIRR', 'CBE_BANK', 'CHAPA', 'BANK_WIRE']),
  accountNumber: z.string().min(6),
  accountName: z.string().min(2),
  currency: z.enum(['ETB', 'USD']).default('ETB'),
});

export class WalletController {
  async getWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const wallet = await walletService.getOrCreateWallet(req.user.id);
      res.json({ success: true, data: wallet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'WALLET_ERROR', message: err.message } });
    }
  }

  async sendTip(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validated = tipSchema.parse(req.body);
      const result = await walletService.sendTip(req.user?.id || null, {
        ...validated,
        senderName: validated.senderName || req.user?.email || 'Anonymous Scholar',
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `Successfully sent ${validated.amountCredits} Research Impact Credits!`,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'TIP_ERROR', message: err.message } });
    }
  }

  async requestWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const validated = withdrawalSchema.parse(req.body);
      const withdrawal = await walletService.requestWithdrawal(req.user.id, validated);

      res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request submitted for compliance and anti-fraud verification.',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'WITHDRAWAL_FAILED', message: err.message } });
    }
  }

  async getBounties(_req: any, res: Response): Promise<void> {
    try {
      const bounties = await walletService.getBounties();
      res.json({ success: true, data: bounties });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'BOUNTIES_ERROR', message: err.message } });
    }
  }
}

export const walletController = new WalletController();
