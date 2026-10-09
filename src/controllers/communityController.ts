import { Request, Response } from 'express';
import { z } from 'zod';
import { communityService } from '../services/communityService';
import { AuthRequest } from '../middleware/auth';

const askQuestionSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  publicationId: z.string().optional(),
});

const answerSchema = z.object({
  content: z.string().min(5),
});

const collabRequestSchema = z.object({
  receiverId: z.string(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export class CommunityController {
  async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      const publicationId = req.query.publicationId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await communityService.getQuestions(publicationId, page, limit);
      res.json({ success: true, data: result.questions, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'COMMUNITY_ERROR', message: err.message } });
    }
  }

  async askQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const validated = askQuestionSchema.parse(req.body);
      const question = await communityService.askQuestion(req.user.id, validated);
      res.status(201).json({ success: true, data: question });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'QUESTION_ERROR', message: err.message } });
    }
  }

  async answerQuestion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const { id } = req.params;
      const validated = answerSchema.parse(req.body);
      const answer = await communityService.answerQuestion(req.user.id, id, validated.content);
      res.status(201).json({ success: true, data: answer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ANSWER_ERROR', message: err.message } });
    }
  }

  async toggleFollow(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const { researcherId } = req.params;
      const result = await communityService.toggleFollow(req.user.id, researcherId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'FOLLOW_ERROR', message: err.message } });
    }
  }

  async sendCollaborationRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const validated = collabRequestSchema.parse(req.body);
      const result = await communityService.sendCollaborationRequest(req.user.id, validated);
      res.status(201).json({ success: true, data: result, message: 'Collaboration request sent successfully.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'COLLAB_ERROR', message: err.message } });
    }
  }
}

export const communityController = new CommunityController();
