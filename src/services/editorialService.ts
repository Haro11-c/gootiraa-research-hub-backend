import { prisma } from '../db/prisma';

export interface EditorialSearchParams {
  categorySlug?: string;
  articleType?: string; // NEWS, EXPLAINER, INVESTIGATION, FACT_CHECK, INTERVIEW
  tag?: string;
  page?: number;
  limit?: number;
}

export class EditorialService {
  async getArticles(params: EditorialSearchParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(30, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { status: 'PUBLISHED' };

    if (params.categorySlug) {
      where.category = { slug: params.categorySlug };
    }

    if (params.articleType) {
      where.articleType = params.articleType;
    }

    if (params.tag) {
      where.tagsJson = { contains: params.tag };
    }

    const [total, articles] = await Promise.all([
      prisma.editorialArticle.count({ where }),
      prisma.editorialArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              profile: {
                select: {
                  fullName: true,
                  academicTitle: true,
                  avatarUrl: true,
                },
              },
            },
          },
          factCheck: true,
        },
      }),
    ]);

    const formatted = articles.map((art) => ({
      ...art,
      tags: JSON.parse(art.tagsJson || '[]'),
      sources: JSON.parse(art.sourcesJson || '[]'),
    }));

    return {
      articles: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getArticleBySlug(slug: string) {
    const article = await prisma.editorialArticle.findUnique({
      where: { slug },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            profile: {
              select: {
                fullName: true,
                academicTitle: true,
                avatarUrl: true,
                bio: true,
              },
            },
          },
        },
        factCheck: true,
        corrections: {
          orderBy: { correctionDate: 'desc' },
        },
      },
    });

    if (!article) return null;

    // Get related articles in same category
    const related = await prisma.editorialArticle.findMany({
      where: {
        id: { not: article.id },
        categoryId: article.categoryId,
        status: 'PUBLISHED',
      },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        coverImageUrl: true,
        articleType: true,
        publishedAt: true,
      },
    });

    return {
      ...article,
      tags: JSON.parse(article.tagsJson || '[]'),
      sources: JSON.parse(article.sourcesJson || '[]'),
      factCheck: article.factCheck
        ? {
            ...article.factCheck,
            academicSources: JSON.parse(article.factCheck.academicSources || '[]'),
          }
        : null,
      related,
    };
  }

  async getCategories() {
    return prisma.editorialCategory.findMany({
      include: {
        _count: {
          select: { articles: { where: { status: 'PUBLISHED' } } },
        },
      },
    });
  }

  async createArticle(data: {
    title: string;
    slug: string;
    summary: string;
    content: string;
    coverImageUrl?: string;
    articleType: string;
    authorId: string;
    categoryId: string;
    tags: string[];
    sources: { title: string; url: string; doi?: string }[];
    factCheck?: {
      claim: string;
      claimant: string;
      verdict: string;
      evidenceSummary: string;
      academicSources: { title: string; doi?: string; url?: string }[];
    };
  }) {
    const article = await prisma.editorialArticle.create({
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        content: data.content,
        coverImageUrl: data.coverImageUrl,
        articleType: data.articleType,
        authorId: data.authorId,
        categoryId: data.categoryId,
        tagsJson: JSON.stringify(data.tags),
        sourcesJson: JSON.stringify(data.sources),
        factCheck: data.factCheck
          ? {
              create: {
                claim: data.factCheck.claim,
                claimant: data.factCheck.claimant,
                verdict: data.factCheck.verdict,
                evidenceSummary: data.factCheck.evidenceSummary,
                academicSources: JSON.stringify(data.factCheck.academicSources),
              },
            }
          : undefined,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: data.authorId,
        action: 'ARTICLE_PUBLISH',
        entityType: 'ARTICLE',
        entityId: article.id,
        detailsJson: JSON.stringify({ title: data.title, type: data.articleType }),
      },
    });

    return article;
  }

  async addCorrection(articleId: string, editorId: string, data: { explanation: string; previousText?: string; updatedText?: string }) {
    const correction = await prisma.correctionRecord.create({
      data: {
        articleId,
        explanation: data.explanation,
        previousText: data.previousText,
        updatedText: data.updatedText,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: editorId,
        action: 'ARTICLE_CORRECTION',
        entityType: 'ARTICLE',
        entityId: articleId,
        detailsJson: JSON.stringify({ explanation: data.explanation }),
      },
    });

    return correction;
  }
}

export const editorialService = new EditorialService();
