import { prisma } from '../db/prisma';
import { scholarlyManager, ScholarlyWork } from '../adapters/scholarlyAdapter';

export interface PublicationSearchParams {
  q?: string;
  documentType?: string;
  reviewStatus?: string;
  isOpenAccess?: boolean;
  region?: string;
  yearFrom?: number;
  yearTo?: number;
  institutionId?: string;
  topicSlug?: string;
  sort?: 'newest' | 'citations' | 'views' | 'relevance';
  page?: number;
  limit?: number;
  includeExternal?: boolean;
}

export class PublicationService {
  async search(params: PublicationSearchParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
    };

    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      where.OR = [
        { title: { contains: q } },
        { abstract: { contains: q } },
        { authorsJson: { contains: q } },
        { keywordsJson: { contains: q } },
        { doi: { contains: q } },
      ];
    }

    if (params.documentType) {
      where.documentType = params.documentType;
    }

    if (params.reviewStatus) {
      where.reviewStatus = params.reviewStatus;
    }

    if (params.isOpenAccess !== undefined) {
      where.isOpenAccess = params.isOpenAccess;
    }

    if (params.region && params.region !== 'ALL') {
      where.region = params.region;
    }

    if (params.institutionId) {
      where.institutionId = params.institutionId;
    }

    if (params.yearFrom || params.yearTo) {
      where.publicationYear = {};
      if (params.yearFrom) where.publicationYear.gte = params.yearFrom;
      if (params.yearTo) where.publicationYear.lte = params.yearTo;
    }

    if (params.topicSlug) {
      where.topics = {
        some: {
          topic: { slug: params.topicSlug },
        },
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'citations') {
      orderBy = { metricsCitations: 'desc' };
    } else if (params.sort === 'views') {
      orderBy = { metricsViews: 'desc' };
    } else if (params.sort === 'newest') {
      orderBy = { publicationYear: 'desc' };
    }

    const [total, publications] = await Promise.all([
      prisma.publication.count({ where }),
      prisma.publication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          institution: true,
          topics: { include: { topic: true } },
          files: { select: { id: true, filename: true, mimeType: true, fileSize: true, isPublic: true } },
        },
      }),
    ]);

    // Parse JSON fields safely
    const formatted = publications.map((p) => ({
      ...p,
      authors: JSON.parse(p.authorsJson || '[]'),
      keywords: JSON.parse(p.keywordsJson || '[]'),
      references: p.referencesJson ? JSON.parse(p.referencesJson) : [],
      source: 'INTERNAL',
    }));

    let externalResults: ScholarlyWork[] = [];
    if (params.includeExternal && params.q && params.q.trim().length > 2) {
      externalResults = await scholarlyManager.searchAll(params.q, 3);
    }

    return {
      publications: formatted,
      externalResults,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const pub = await prisma.publication.findUnique({
      where: { id },
      include: {
        institution: true,
        submitter: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
          },
        },
        topics: { include: { topic: true } },
        files: true,
        questions: {
          include: {
            user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true, academicTitle: true } } } },
            answers: {
              include: {
                user: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true, academicTitle: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pub) return null;

    // Increment view count atomically
    await prisma.publication.update({
      where: { id },
      data: { metricsViews: { increment: 1 } },
    });

    // Find related papers by topic
    const topicIds = pub.topics.map((t) => t.topicId);
    const related = await prisma.publication.findMany({
      where: {
        id: { not: id },
        status: 'PUBLISHED',
        topics: { some: { topicId: { in: topicIds } } },
      },
      take: 4,
      select: {
        id: true,
        title: true,
        publicationYear: true,
        reviewStatus: true,
        documentType: true,
        metricsCitations: true,
        authorsJson: true,
      },
    });

    return {
      ...pub,
      authors: JSON.parse(pub.authorsJson || '[]'),
      keywords: JSON.parse(pub.keywordsJson || '[]'),
      references: pub.referencesJson ? JSON.parse(pub.referencesJson) : [],
      related: related.map((r) => ({
        ...r,
        authors: JSON.parse(r.authorsJson || '[]'),
      })),
    };
  }

  async create(data: {
    title: string;
    abstract: string;
    authors: { name: string; affiliation?: string; orcid?: string }[];
    publicationYear: number;
    documentType: string;
    reviewStatus: string;
    license: string;
    venue?: string;
    publisher?: string;
    doi?: string;
    arxivId?: string;
    isOpenAccess?: boolean;
    region?: string;
    keywords: string[];
    references?: string[];
    institutionId?: string;
    submitterId: string;
    fileInfo?: {
      filename: string;
      storageKey: string;
      fileSize: number;
      checksumSha256: string;
      mimeType: string;
    };
  }) {
    // Check for duplicate DOI if provided
    if (data.doi) {
      const existing = await prisma.publication.findUnique({
        where: { doi: data.doi },
      });
      if (existing) {
        throw new Error(`A publication with DOI "${data.doi}" is already registered in the system.`);
      }
    }

    const publication = await prisma.publication.create({
      data: {
        title: data.title,
        abstract: data.abstract,
        authorsJson: JSON.stringify(data.authors),
        keywordsJson: JSON.stringify(data.keywords),
        referencesJson: data.references ? JSON.stringify(data.references) : null,
        publicationYear: data.publicationYear,
        documentType: data.documentType,
        reviewStatus: data.reviewStatus,
        license: data.license,
        venue: data.venue,
        publisher: data.publisher,
        doi: data.doi,
        arxivId: data.arxivId,
        isOpenAccess: data.isOpenAccess ?? true,
        region: data.region || 'GLOBAL',
        status: 'SUBMITTED', // Requires moderation or reviewer clearance before becoming PUBLISHED
        submitterId: data.submitterId,
        institutionId: data.institutionId,
        files: data.fileInfo
          ? {
              create: {
                filename: data.fileInfo.filename,
                storageKey: data.fileInfo.storageKey,
                fileSize: data.fileInfo.fileSize,
                checksumSha256: data.fileInfo.checksumSha256,
                mimeType: data.fileInfo.mimeType,
                isPublic: data.isOpenAccess ?? true,
              },
            }
          : undefined,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: data.submitterId,
        action: 'PUB_SUBMIT',
        entityType: 'PUBLICATION',
        entityId: publication.id,
        detailsJson: JSON.stringify({ title: data.title, documentType: data.documentType }),
      },
    });

    return publication;
  }

  exportCitation(pub: any, format: 'bibtex' | 'ris' | 'apa' | 'ieee'): string {
    const authors: { name: string }[] = Array.isArray(pub.authors) ? pub.authors : JSON.parse(pub.authorsJson || '[]');
    const firstAuthor = authors[0]?.name || 'Author';
    const firstAuthorFamily = firstAuthor.split(' ').pop() || 'Author';
    const citeKey = `${firstAuthorFamily.toLowerCase()}${pub.publicationYear}${pub.title.substring(0, 10).toLowerCase().replace(/[^a-z]/g, '')}`;

    switch (format) {
      case 'bibtex':
        return `@article{${citeKey},
  title = {${pub.title}},
  author = {${authors.map((a) => a.name).join(' and ')}},
  year = {${pub.publicationYear}},
  journal = {${pub.venue || 'Gootiraa Research Hub'}},
  ${pub.doi ? `doi = {${pub.doi}},` : ''}
  url = {https://gootiraa.org/publication/${pub.id}}
}`;

      case 'ris':
        let ris = `TY  - JOUR\n`;
        ris += `TI  - ${pub.title}\n`;
        authors.forEach((a) => { ris += `AU  - ${a.name}\n`; });
        ris += `PY  - ${pub.publicationYear}\n`;
        if (pub.venue) ris += `JO  - ${pub.venue}\n`;
        if (pub.doi) ris += `DO  - ${pub.doi}\n`;
        ris += `UR  - https://gootiraa.org/publication/${pub.id}\n`;
        ris += `ER  - \n`;
        return ris;

      case 'apa':
        const authorListApa = authors.map((a) => a.name).join(', ');
        return `${authorListApa} (${pub.publicationYear}). ${pub.title}. ${pub.venue ? `${pub.venue}. ` : ''}${pub.doi ? `https://doi.org/${pub.doi}` : `https://gootiraa.org/publication/${pub.id}`}`;

      case 'ieee':
        const authorListIeee = authors.map((a) => a.name).join(', ');
        return `${authorListIeee}, "${pub.title}," ${pub.venue ? `${pub.venue}, ` : ''}${pub.publicationYear}.${pub.doi ? ` doi: ${pub.doi}.` : ''}`;

      default:
        return pub.title;
    }
  }

  async toggleBookmark(userId: string, publicationId: string) {
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_publicationId: { userId, publicationId },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
      await prisma.publication.update({
        where: { id: publicationId },
        data: { metricsBookmarks: { decrement: 1 } },
      });
      return { bookmarked: false };
    } else {
      await prisma.bookmark.create({
        data: { userId, publicationId },
      });
      await prisma.publication.update({
        where: { id: publicationId },
        data: { metricsBookmarks: { increment: 1 } },
      });
      return { bookmarked: true };
    }
  }
}

export const publicationService = new PublicationService();
