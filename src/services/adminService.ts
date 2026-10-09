import { prisma } from '../db/prisma';

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      totalResearchers,
      totalPublications,
      totalPendingSubmissions,
      totalArticles,
      totalOpenReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'RESEARCHER' } }),
      prisma.publication.count({ where: { status: 'PUBLISHED' } }),
      prisma.publication.count({ where: { status: 'SUBMITTED' } }),
      prisma.editorialArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      users: { total: totalUsers, researchers: totalResearchers },
      publications: { published: totalPublications, pendingModeration: totalPendingSubmissions },
      editorial: { articles: totalArticles },
      moderation: { openReports: totalOpenReports },
      providers: {
        openAlex: { status: 'OPERATIONAL', lastChecked: new Date() },
        crossref: { status: 'OPERATIONAL', lastChecked: new Date() },
        arxiv: { status: 'OPERATIONAL', lastChecked: new Date() },
      },
    };
  }

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
    const status = action === 'APPROVED' ? 'PUBLISHED' : 'WITHDRAWN';

    const publication = await prisma.publication.update({
      where: { id: submissionId },
      data: {
        status,
        moderationNote: notes,
      },
    });

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

  async getAuditLogs(page = 1, limit = 20) {
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
