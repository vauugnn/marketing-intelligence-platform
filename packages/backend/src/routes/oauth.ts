import { Router } from 'express';
import { getOAuthService } from '../services/oauth/OAuthServiceFactory';
import * as syncService from '../services/sync.service';
import { Platform } from '@shared/types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * OAuth callback endpoint
 * All platforms redirect here after user authorization.
 * Exchanges the authorization code for tokens, saves the connection,
 * and triggers a background historical data sync.
 *
 * GET /api/oauth/callback?code=xxx&state=yyy
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      const errorMsg = error_description || error;
      logger.error('OAuthCallback', `OAuth error: ${errorMsg}`);
      return res.redirect(
        `${process.env.FRONTEND_URL}/integrations?status=error&message=${encodeURIComponent(String(errorMsg))}`
      );
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter'
      });
    }

    // Decode state to determine which platform this is for
    // State is base64url encoded JSON: { userId, platform, nonce, timestamp }
    const decodedState = Buffer.from(String(state), 'base64url').toString('utf8');
    const stateData = JSON.parse(decodedState);
    const platform: Platform = stateData.platform;
    const userId: string = stateData.userId;

    // Get the appropriate OAuth service
    const service = getOAuthService(platform);

    // Handle the callback (exchanges code for tokens, saves to database)
    await service.handleCallback(String(code), String(state));

    logger.info('OAuthCallback', `${platform} connected for user ${userId}`);

    // Trigger background historical data sync
    syncService.syncHistoricalData(userId, platform).catch(err => {
      logger.error('OAuthCallback', `Background sync failed for ${platform}`, err);
    });

    // Redirect back to frontend with success
    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?status=connected&platform=${platform}`
    );
  } catch (error: any) {
    logger.error('OAuthCallback', 'OAuth callback failed', error);

    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?status=error&message=${encodeURIComponent(error.message || 'OAuth failed')}`
    );
  }
});

export default router;
