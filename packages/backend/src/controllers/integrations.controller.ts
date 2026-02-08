import { Request, Response } from 'express';
import Stripe from 'stripe';
import { Platform } from '@shared/types';
import { getOAuthService } from '../services/oauth/OAuthServiceFactory';
import * as connectionService from '../services/connection.service';
import * as syncService from '../services/sync.service';
import { logger } from '../utils/logger';

// All platforms that can be connected
const ALL_PLATFORMS: Platform[] = ['google_analytics_4', 'meta', 'stripe', 'paypal'];

/**
 * Lists all platform connections for the authenticated user.
 * Returns all platforms (connected or not) so the frontend always has a complete list.
 * Strips sensitive fields (tokens) from the response.
 */
export async function listConnections(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const connections = await connectionService.getConnectionsByUser(userId);

  const result = ALL_PLATFORMS.map(platform => {
    const existing = connections.find(c => c.platform === platform);
    if (existing) {
      return {
        platform: existing.platform,
        status: existing.status,
        connected_at: existing.connected_at,
        last_synced_at: existing.last_synced_at,
        platform_account_id: existing.platform_account_id,
      };
    }
    return { platform, status: 'disconnected' };
  });

  res.json({ success: true, data: result });
}

/**
 * Initiates the OAuth connection flow for a platform.
 * Returns the authorization URL for OAuth platforms, or instructions for API key platforms.
 */
export async function initiateConnect(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const platform = req.params.platform as Platform;

  if (!ALL_PLATFORMS.includes(platform)) {
    res.status(400).json({ success: false, error: `Unsupported platform: ${platform}` });
    return;
  }

  // Stripe uses API key, not OAuth redirect flow
  if (platform === 'stripe') {
    res.json({
      success: true,
      data: {
        type: 'api_key',
        message: 'Please provide your Stripe secret API key to connect.',
      },
    });
    return;
  }

  // Generate OAuth authorization URL using class-based service
  const service = getOAuthService(platform);
  const authUrl = await service.getAuthUrl(userId);

  res.json({
    success: true,
    data: { type: 'oauth', authUrl },
  });
}

/**
 * Connects a platform using an API key (used for Stripe).
 * Validates the key, stores the connection, and triggers historical sync.
 */
export async function connectWithApiKey(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const platform = req.params.platform as Platform;
  const { apiKey } = req.body;

  if (!apiKey) {
    res.status(400).json({ success: false, error: 'API key is required' });
    return;
  }

  if (platform !== 'stripe') {
    res.status(400).json({ success: false, error: `API key connection is not supported for ${platform}` });
    return;
  }

  // Validate the Stripe API key by making a test call
  const stripe = new Stripe(apiKey);
  await stripe.balance.retrieve();

  // Store the connection
  await connectionService.upsertConnection({
    userId,
    platform,
    status: 'connected',
    accessToken: apiKey,
  });

  logger.info('IntegrationsController', `Stripe connected for user ${userId}`);

  // Trigger historical sync in the background
  syncService.syncHistoricalData(userId, platform).catch(err => {
    logger.error('IntegrationsController', 'Background Stripe sync failed', err);
  });

  res.json({ success: true, message: 'Stripe connected successfully. Syncing historical data...' });
}

/**
 * Disconnects a platform by revoking access and removing the connection.
 */
export async function disconnect(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const platform = req.params.platform as Platform;

  // Use the OAuth service to properly revoke access before deleting
  try {
    const service = getOAuthService(platform);
    await service.disconnect(userId);
  } catch {
    // If OAuth service isn't available for this platform, delete directly
    await connectionService.deleteConnection(userId, platform);
  }

  res.json({ success: true, message: `Disconnected from ${platform}` });
}
