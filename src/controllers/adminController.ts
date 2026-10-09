import { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from '../services/adminService';
import { walletService } from '../services/walletService';
import { AuthRequest } from '../middleware/auth';

const reviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().min(5),
});

const userRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(['USER', 'RESEARCHER', 'EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']),
});

const verificationSchema = z.object({
  targetUserId: z.string().uuid(),
  verifiedStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'PENDING']),
});

const payoutReviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().min(3),
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

  // --- Super Admin: User and Security Controls ---
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
        return;
      }

      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;
      const verifiedStatus = req.query.verifiedStatus as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;

      const result = await adminService.getUsers(search, role, verifiedStatus, page, limit);
      res.json({ success: true, data: result.users, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'USERS_ERROR', message: err.message } });
    }
  }

  async updateUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only Super Administrators can modify roles.' } });
        return;
      }

      const { targetUserId, role } = userRoleSchema.parse(req.body);
      const updated = await adminService.updateUserRole(req.user.id, targetUserId, role);
      res.json({ success: true, data: updated, message: `User role updated to ${role}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'ROLE_UPDATE_FAILED', message: err.message } });
    }
  }

  async updateUserVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
        return;
      }

      const { targetUserId, verifiedStatus } = verificationSchema.parse(req.body);
      const updated = await adminService.updateUserVerification(req.user.id, targetUserId, verifiedStatus);
      res.json({ success: true, data: updated, message: `Identity verification set to ${verifiedStatus}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_UPDATE_FAILED', message: err.message } });
    }
  }

  // --- Super Admin: Financial Payouts & Anti-Fraud ---
  async getPayoutRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Financial payout reviews restricted to Super Administrators.' } });
        return;
      }

      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;

      const result = await adminService.getPayoutRequests(status, page, limit);
      res.json({ success: true, data: result.requests, meta: result.meta });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'PAYOUTS_ERROR', message: err.message } });
    }
  }

  async reviewPayoutRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Financial payout review restricted to Super Administrators.' } });
        return;
      }

      const { id } = req.params;
      const { action, notes } = payoutReviewSchema.parse(req.body);
      const updated = await walletService.reviewWithdrawal(req.user.id, id, action, notes);
      res.json({ success: true, data: updated, message: `Payout request marked as ${action}.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'PAYOUT_REVIEW_FAILED', message: err.message } });
    }
  }

  async getFraudAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Restricted to Super Administrators.' } });
        return;
      }

      const alerts = await adminService.getFraudAlerts();
      res.json({ success: true, data: alerts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'FRAUD_ALERTS_ERROR', message: err.message } });
    }
  }

  // --- Academic Moderator: Submissions Queue ---
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
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
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
