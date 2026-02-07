import { Request, Response } from 'express';
import { Platform } from '@shared/types';
import * as oauthService from '../services/oauth.service';
import * as connectionService from '../services/connection.service';
import * as syncService from '../services/sync.service';
import { logger } from '../utils/logger';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Handles the OAuth callback from external platforms.
 * Extracts the authorization code, exchanges it for tokens,
 * stores the connection, triggers historical sync, and redirects to frontend.
 */
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error: oauthError } = req.query;

  // Handle user denied authorization
  if (oauthError) {
    logger.warn('OAuthCallback', 'User denied authorization', { error: oauthError });
    res.redirect(`${FRONTEND_URL}/integrations?error=access_denied`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/integrations?error=missing_params`);
    return;
  }

  try {
    // Decode the state parameter to get platform and userId
    const decoded = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { platform, userId } = decoded as { platform: Platform; userId: string };

    if (!platform || !userId) {
      res.redirect(`${FRONTEND_URL}/integrations?error=invalid_state`);
      return;
    }

    // Exchange authorization code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(platform, code as string);

    // Calculate token expiry date
    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : undefined;

    // Store the connection in the database
    await connectionService.upsertConnection({
      userId,
      platform,
      status: 'connected',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt,
    });

    logger.info('OAuthCallback', `Successfully connected ${platform} for user ${userId}`);

    // Trigger historical data sync in the background (fire-and-forget)
    syncService.syncHistoricalData(userId, platform).catch(err => {
      logger.error('OAuthCallback', `Background sync failed for ${platform}`, err);
    });

    // Redirect back to the frontend integrations page
    res.redirect(`${FRONTEND_URL}/integrations?connected=${platform}`);
  } catch (err) {
    logger.error('OAuthCallback', 'OAuth callback failed', err);
    res.redirect(`${FRONTEND_URL}/integrations?error=token_exchange_failed`);
  }
}
