import { Router } from 'express';
import { linkController } from '../controllers/link.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/links/shorten - Create a new short link (protected)
router.post('/shorten', authMiddleware, linkController.createLink);

// GET /s/:code - Resolve and redirect short link (public)
router.get('/:code', linkController.redirectLink);

export default router;
