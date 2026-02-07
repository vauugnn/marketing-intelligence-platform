import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as integrationsController from '../controllers/integrations.controller';

const router = Router();

// All integration routes require authentication
router.use(authMiddleware);

// GET /api/integrations - List all platform connections for the user
router.get('/', asyncHandler(integrationsController.listConnections));

// POST /api/integrations/:platform/connect - Initiate OAuth flow (returns auth URL)
router.post('/:platform/connect', asyncHandler(integrationsController.initiateConnect));

// POST /api/integrations/:platform/connect/apikey - Connect via API key (Stripe)
router.post('/:platform/connect/apikey', asyncHandler(integrationsController.connectWithApiKey));

// DELETE /api/integrations/:platform - Disconnect a platform
router.delete('/:platform', asyncHandler(integrationsController.disconnect));

export default router;
