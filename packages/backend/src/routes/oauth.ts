import { Router } from 'express';
import { getOAuthService } from '../services/oauth/OAuthServiceFactory';
import { Platform } from '@shared/types';

const router = Router();

/**
 * OAuth callback endpoint
 * All platforms redirect here after user authorization
 * GET /api/oauth/callback?code=xxx&state=yyy
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      const errorMsg = error_description || error;
      console.error('OAuth error:', errorMsg);
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

    // Get the appropriate OAuth service
    const service = getOAuthService(platform);

    // Handle the callback (exchanges code for tokens, saves to database)
    await service.handleCallback(String(code), String(state));

    // Redirect back to frontend with success
    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?status=connected&platform=${platform}`
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);

    res.redirect(
      `${process.env.FRONTEND_URL}/integrations?status=error&message=${encodeURIComponent(error.message || 'OAuth failed')}`
    );
  }
});

export default router;
