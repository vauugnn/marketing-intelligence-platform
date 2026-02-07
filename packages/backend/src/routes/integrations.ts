import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as integrationsController from '../controllers/integrations.controller';

const router = Router();

// All integration routes require authentication
router.use(authMiddleware);

// GET /api/integrations - List all platform connections for the user
router.get('/', asyncHandler(integrationsController.listConnections));

// POST /api/integrations/:platform/connect - Start OAuth flow
router.post('/:platform/connect', asyncHandler(integrationsController.initiateConnect));

// POST /api/integrations/:platform/connect/api-key - Connect via API key (Stripe)
router.post('/:platform/connect/api-key', asyncHandler(integrationsController.connectWithApiKey));

// DELETE /api/integrations/:platform - Disconnect a platform
router.delete('/:platform', asyncHandler(integrationsController.disconnect));

export default router;
