import { prisma } from '../db/prisma';
import { walletService } from './walletService';

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      totalResearchers,
      totalPublications,
      totalPendingSubmissions,
      totalArticles,
      totalOpenReports,
      totalPendingPayouts,
      totalCreditsCirculating,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'RESEARCHER' } }),
      prisma.publication.count({ where: { status: 'PUBLISHED' } }),
      prisma.publication.count({ where: { status: 'SUBMITTED' } }),
      prisma.editorialArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
      prisma.wallet.aggregate({ _sum: { balanceCredits: true } }),
    ]);

    return {
      users: { total: totalUsers, researchers: totalResearchers },
      publications: { published: totalPublications, pendingModeration: totalPendingSubmissions },
      editorial: { articles: totalArticles },
      moderation: { openReports: totalOpenReports },
      finance: {
        pendingPayoutsCount: totalPendingPayouts,
        totalCreditsInWallets: totalCreditsCirculating._sum.balanceCredits || 0,
      },
      providers: {
        openAlex: { status: 'OPERATIONAL', lastChecked: new Date() },
        crossref: { status: 'OPERATIONAL', lastChecked: new Date() },
        arxiv: { status: 'OPERATIONAL', lastChecked: new Date() },
      },
    };
  }

  // Super Admin & Admin: User and Role Management
  async getUsers(search?: string, role?: string, verifiedStatus?: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (verifiedStatus) {
      where.profile = { ...(where.profile || {}), verifiedStatus };
    }

    if (search && search.trim()) {
      where.OR = [
        { email: { contains: search } },
        { profile: { fullName: { contains: search } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { include: { institution: true } },
          wallet: { select: { balanceCredits: true, totalEarnedCredits: true } },
        },
      }),
    ]);

    return {
      users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Super Admin: Role Elevation with Anti-Escalation Safeguards
  async updateUserRole(adminUserId: string, targetUserId: string, newRole: string) {
    const allowedRoles = ['USER', 'RESEARCHER', 'EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
      throw new Error('Only a verified Super Administrator can modify administrative roles.');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      include: { profile: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'SUPERADMIN_ROLE_CHANGE',
        entityType: 'USER',
        entityId: targetUserId,
        detailsJson: JSON.stringify({ newRole, targetEmail: updated.email }),
      },
    });

    return updated;
  }

  // Super Admin & Admin: Verify Researcher Identity (KYC Gate)
  async updateUserVerification(adminUserId: string, targetUserId: string, verifiedStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING') {
    const profile = await prisma.userProfile.update({
      where: { userId: targetUserId },
      data: { verifiedStatus },
    });

    const userUpdateData: any = { isVerified: verifiedStatus === 'VERIFIED' };
    if (verifiedStatus === 'VERIFIED') {
      const currentUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (currentUser && currentUser.role === 'USER') {
        userUpdateData.role = 'RESEARCHER';
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: userUpdateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADMIN_VERIFICATION_STATUS',
        entityType: 'USER',
        entityId: targetUserId,
        detailsJson: JSON.stringify({ verifiedStatus }),
      },
    });

    return profile;
  }

  // Super Admin: Financial Payout & Fraud Approvals
  async getPayoutRequests(status?: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [total, requests] = await Promise.all([
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              profile: {
                select: {
                  fullName: true,
                  academicTitle: true,
                  verifiedStatus: true,
                  institution: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      requests: requests.map((r) => ({
        ...r,
        fraudFlags: r.fraudFlagsJson ? JSON.parse(r.fraudFlagsJson) : [],
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Super Admin: Fraud Detection Alerts
  async getFraudAlerts() {
    const flaggedWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { fraudRiskScore: { gte: 40 }, status: 'PENDING' },
      include: {
        user: { select: { email: true, profile: true } },
      },
      orderBy: { fraudRiskScore: 'desc' },
      take: 10,
    });

    return {
      flaggedWithdrawals: flaggedWithdrawals.map((f) => ({
        ...f,
        fraudFlags: f.fraudFlagsJson ? JSON.parse(f.fraudFlagsJson) : [],
      })),
    };
  }

  // Moderator / Admin: Research Submissions Queue
  async getPendingSubmissions(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, submissions] = await Promise.all([
      prisma.publication.count({ where: { status: 'SUBMITTED' } }),
      prisma.publication.findMany({
        where: { status: 'SUBMITTED' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { id: true, email: true, profile: true } },
          files: true,
          institution: true,
        },
      }),
    ]);

    return {
      submissions: submissions.map((s) => ({
        ...s,
        authors: JSON.parse(s.authorsJson || '[]'),
        keywords: JSON.parse(s.keywordsJson || '[]'),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewSubmission(moderatorId: string, submissionId: string, action: 'APPROVED' | 'REJECTED', notes: string) {
    const status = action === 'APPROVED' ? 'PUBLISHED' : 'REJECTED';

    const publication = await prisma.publication.update({
      where: { id: submissionId },
      data: {
        status,
        moderationNote: notes,
      },
    });

    // If approved, give author a platform Research Grant / Reward bonus (e.g. 200 Credits)
    if (action === 'APPROVED' && publication.submitterId) {
      await walletService.sendTip(null, {
        receiverUserId: publication.submitterId,
        amountCredits: 200, // 200 RC publication approval incentive
        publicationId: publication.id,
        senderName: 'Gootiraa Research Foundation Grant',
        message: 'Grant reward for verified open-access publication acceptance.',
      }).catch(() => {});
    }

    await prisma.moderationAction.create({
      data: {
        moderatorId,
        targetType: 'PUBLICATION',
        targetId: submissionId,
        action,
        notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: `PUB_MODERATION_${action}`,
        entityType: 'PUBLICATION',
        entityId: submissionId,
        detailsJson: JSON.stringify({ action, notes }),
      },
    });

    return publication;
  }

  async getAuditLogs(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
    ]);

    return {
      logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReports(status?: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, email: true } },
        },
      }),
    ]);

    return {
      reports,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const adminService = new AdminService();
