import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  role: z.enum(['USER', 'RESEARCHER']).default('USER'),
  academicTitle: z.string().optional(),
  affiliationName: z.string().optional(),
  orcidId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: validated.email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email address already exists.' },
        });
        return;
      }

      const passwordHash = await bcrypt.hash(validated.password, 10);

      // Handle institution if provided
      let institutionId: string | undefined;
      if (validated.affiliationName) {
        const inst = await prisma.institution.findFirst({
          where: { name: { contains: validated.affiliationName } },
        });
        if (inst) institutionId = inst.id;
      }

      const user = await prisma.user.create({
        data: {
          email: validated.email.toLowerCase(),
          passwordHash,
          role: validated.role,
          profile: {
            create: {
              fullName: validated.fullName,
              academicTitle: validated.academicTitle,
              institutionId,
              orcidId: validated.orcidId,
            },
          },
        },
        include: { profile: true },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'AUTH_REGISTER',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            profile: user.profile,
          },
          token,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Invalid input data' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Registration failed. Please try again.' },
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: validated.email.toLowerCase() },
        include: { profile: { include: { institution: true } } },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        });
        return;
      }

      const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'AUTH_LOGIN',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            profile: user.profile,
          },
          token,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Invalid input data' },
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Login failed. Please try again.' },
      });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: { include: { institution: true } },
        bookmarks: { select: { publicationId: true } },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
        bookmarkedPublicationIds: user.bookmarks.map((b) => b.publicationId),
      },
    });
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' },
      });
      return;
    }

    const { fullName, bio, academicTitle, department, orcidId, website, researchInterests } = req.body;

    const profile = await prisma.userProfile.update({
      where: { userId: req.user.id },
      data: {
        fullName,
        bio,
        academicTitle,
        department,
        orcidId,
        website,
        researchInterests: Array.isArray(researchInterests) ? researchInterests.join(', ') : researchInterests,
      },
      include: { institution: true },
    });

    res.json({
      success: true,
      data: profile,
    });
  }

  async getResearcherProfile(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const profile = await prisma.userProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        institution: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            publications: {
              where: { status: 'PUBLISHED' },
              orderBy: { publicationYear: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Researcher profile not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...profile,
        publications: profile.user.publications.map((p) => ({
          ...p,
          authors: JSON.parse(p.authorsJson || '[]'),
          keywords: JSON.parse(p.keywordsJson || '[]'),
        })),
      },
    });
  }
}

export const authController = new AuthController();
