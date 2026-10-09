import { Router } from 'express';
import authRoutes from './authRoutes';
import publicationRoutes from './publicationRoutes';
import editorialRoutes from './editorialRoutes';
import aiRoutes from './aiRoutes';
import communityRoutes from './communityRoutes';
import adminRoutes from './adminRoutes';
import walletRoutes from './walletRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/publications', publicationRoutes);
router.use('/editorial', editorialRoutes);
router.use('/ai', aiRoutes);
router.use('/community', communityRoutes);
router.use('/admin', adminRoutes);
router.use('/wallet', walletRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Gootiraa Research Hub API',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
