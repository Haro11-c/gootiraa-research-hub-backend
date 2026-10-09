import { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from '../services/adminService';
import { AuthRequest } from '../middleware/auth';

const reviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().min(5),
});

export class AdminController {
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: err.message } });
    }
  }

  async getPendingSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await adminService.getPendingSubmissions(page, limit);
      res.json({ success: true, data: result.submissions, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'MODERATION_ERROR', message: err.message } });
    }
  }

  async reviewSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required.' } });
        return;
      }

      const { id } = req.params;
      const validated = reviewSchema.parse(req.body);
      const publication = await adminService.reviewSubmission(req.user.id, id, validated.action, validated.notes);
      res.json({ success: true, data: publication, message: `Submission successfully marked as ${validated.action}.` });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'REVIEW_FAILED', message: err.message } });
    }
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await adminService.getAuditLogs(page, limit);
      res.json({ success: true, data: result.logs, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUDIT_ERROR', message: err.message } });
    }
  }

  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const result = await adminService.getReports(status, page, limit);
      res.json({ success: true, data: result.reports, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'REPORT_ERROR', message: err.message } });
    }
  }
}

export const adminController = new AdminController();
