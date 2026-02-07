import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as syncController from '../controllers/sync.controller';

const router = Router();

// All sync routes require authentication
router.use(authMiddleware);

// GET /api/sync/status - Get sync status for all connected platforms
router.get('/status', asyncHandler(syncController.getSyncStatus));

// POST /api/sync/:platform - Trigger manual re-sync for a platform
router.post('/:platform', asyncHandler(syncController.triggerSync));

export default router;
