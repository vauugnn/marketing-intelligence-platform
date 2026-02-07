import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import * as oauthController from '../controllers/oauth.controller';

const router = Router();

// GET /api/oauth/callback - OAuth redirect target from external platforms
// No auth middleware here: user arrives via redirect from Google/Meta/PayPal
router.get('/callback', asyncHandler(oauthController.handleOAuthCallback));

export default router;
