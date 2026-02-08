import { Router } from 'express';
import { getOAuthService } from '../services/oauth/OAuthServiceFactory';
import { OAuthRepository } from '../services/oauth/OAuthRepository';
import { Platform } from '@shared/types';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import * as integrationsController from '../controllers/integrations.controller';

const router = Router();
const repository = new OAuthRepository();

/**
 * GET /api/integrations - List all platform connections for a user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId!;

    // Query only the fields we need (skip token decryption)
    const { data: connections, error } = await supabaseAdmin
      .from('platform_connections')
      .select('platform, status, connected_at, last_synced_at')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get connections: ${error.message}`);

    // Return all supported platforms with their connection status
    const allPlatforms: Platform[] = [
      'google_analytics_4',
      'meta',
      'stripe',
      'paypal',
      'google_ads',
      'hubspot',
      'mailchimp'
    ];

    const platformStatuses = allPlatforms.map(platform => {
      const connection = (connections || []).find((c: any) => c.platform === platform);
      return {
        platform,
        status: connection?.status || 'disconnected',
        connected_at: connection?.connected_at,
        last_synced_at: connection?.last_synced_at
      };
    });

    res.json({
      success: true,
      data: platformStatuses
    });
  } catch (error: any) {
    console.error('Failed to get integrations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/:platform/connect - Start OAuth flow
 * Returns authorization URL to redirect user to
 */
router.post('/:platform/connect', authMiddleware, async (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const userId = req.userId!;

    // Get OAuth service for this platform
    const service = getOAuthService(platform);

    // Generate authorization URL
    const authUrl = await service.getAuthUrl(userId);

    res.json({
      success: true,
      authUrl
    });
  } catch (error: any) {
    console.error(`Failed to initiate OAuth for ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/integrations/:platform - Disconnect platform
 */
router.delete('/:platform', authMiddleware, async (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const userId = req.userId!;

    // Get OAuth service and disconnect
    const service = getOAuthService(platform);
    await service.disconnect(userId);

    res.json({
      success: true,
      message: `Disconnected from ${platform}`
    });
  } catch (error: any) {
    console.error(`Failed to disconnect ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
