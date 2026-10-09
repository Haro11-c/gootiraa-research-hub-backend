import { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/aiService';

const summarizeSchema = z.object({
  publicationId: z.string().uuid(),
});

const askSchema = z.object({
  publicationId: z.string().uuid(),
  question: z.string().min(3).max(500),
});

const compareSchema = z.object({
  publicationId1: z.string().uuid(),
  publicationId2: z.string().uuid(),
});

const explainSchema = z.object({
  term: z.string().min(2).max(100),
  contextSnippet: z.string().optional(),
});

export class AIController {
  async summarize(req: Request, res: Response): Promise<void> {
    try {
      const { publicationId } = summarizeSchema.parse(req.body);
      const summary = await aiService.summarizePublication(publicationId);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AI_SUMMARIZE_ERROR', message: err.message } });
    }
  }

  async ask(req: Request, res: Response): Promise<void> {
    try {
      const { publicationId, question } = askSchema.parse(req.body);
      const answer = await aiService.askPublication(publicationId, question);
      res.json({ success: true, data: answer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AI_ASK_ERROR', message: err.message } });
    }
  }

  async compare(req: Request, res: Response): Promise<void> {
    try {
      const { publicationId1, publicationId2 } = compareSchema.parse(req.body);
      const comparison = await aiService.comparePublications(publicationId1, publicationId2);
      res.json({ success: true, data: comparison });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AI_COMPARE_ERROR', message: err.message } });
    }
  }

  async explain(req: Request, res: Response): Promise<void> {
    try {
      const { term, contextSnippet } = explainSchema.parse(req.body);
      const explanation = await aiService.explainTerminology(term, contextSnippet);
      res.json({ success: true, data: explanation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'AI_EXPLAIN_ERROR', message: err.message } });
    }
  }
}

export const aiController = new AIController();
