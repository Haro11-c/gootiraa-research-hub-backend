import { Request, Response } from 'express';
import { z } from 'zod';
import { editorialService } from '../services/editorialService';
import { AuthRequest } from '../middleware/auth';

const createArticleSchema = z.object({
  title: z.string().min(5),
  slug: z.string().min(3),
  summary: z.string().min(20),
  content: z.string().min(50),
  coverImageUrl: z.string().optional(),
  articleType: z.enum(['NEWS', 'EXPLAINER', 'INVESTIGATION', 'FACT_CHECK', 'INTERVIEW']),
  categoryId: z.string(),
  tags: z.array(z.string()).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.string(), doi: z.string().optional() })).default([]),
  factCheck: z.object({
    claim: z.string(),
    claimant: z.string(),
    verdict: z.string(),
    evidenceSummary: z.string(),
    academicSources: z.array(z.object({ title: z.string(), doi: z.string().optional(), url: z.string().optional() })),
  }).optional(),
});

export class EditorialController {
  async getArticles(req: Request, res: Response): Promise<void> {
    try {
      const categorySlug = req.query.categorySlug as string | undefined;
      const articleType = req.query.articleType as string | undefined;
      const tag = req.query.tag as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await editorialService.getArticles({ categorySlug, articleType, tag, page, limit });
      res.json({ success: true, data: result.articles, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'EDITORIAL_ERROR', message: err.message } });
    }
  }

  async getArticleBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const article = await editorialService.getArticleBySlug(slug);

      if (!article) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found.' } });
        return;
      }

      res.json({ success: true, data: article });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RETRIEVAL_ERROR', message: err.message } });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await editorialService.getCategories();
      res.json({ success: true, data: categories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CATEGORIES_ERROR', message: err.message } });
    }
  }

  async createArticle(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const validated = createArticleSchema.parse(req.body);
      const article = await editorialService.createArticle({
        ...validated,
        authorId: req.user.id,
      });

      res.status(201).json({ success: true, data: article });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'ARTICLE_CREATION_FAILED', message: err.message } });
    }
  }

  async addCorrection(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const { id } = req.params;
      const { explanation, previousText, updatedText } = req.body;

      if (!explanation) {
        res.status(400).json({ success: false, error: { code: 'MISSING_EXPLANATION', message: 'Explanation is required.' } });
        return;
      }

      const correction = await editorialService.addCorrection(id, req.user.id, { explanation, previousText, updatedText });
      res.status(201).json({ success: true, data: correction });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CORRECTION_ERROR', message: err.message } });
    }
  }
}

export const editorialController = new EditorialController();
