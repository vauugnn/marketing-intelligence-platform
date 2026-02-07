import { Router } from 'express';

const router = Router();

// GET /api/integrations - List all platform connections
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        platform: 'google_analytics_4',
        status: 'connected',
        connected_at: '2024-01-15T10:30:00Z',
        last_synced_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        sync_progress: null,
      },
      {
        platform: 'meta',
        status: 'connected',
        connected_at: '2024-01-16T09:00:00Z',
        last_synced_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        sync_progress: 72,
      },
      {
        platform: 'google_ads',
        status: 'pending',
        connected_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        last_synced_at: null,
        sync_progress: 15,
      },
      {
        platform: 'stripe',
        status: 'connected',
        connected_at: '2024-01-10T08:00:00Z',
        last_synced_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        sync_progress: null,
      },
      {
        platform: 'paypal',
        status: 'error',
        connected_at: '2024-01-12T16:00:00Z',
        last_synced_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        sync_progress: null,
      },
      {
        platform: 'hubspot',
        status: 'disconnected',
        connected_at: null,
        last_synced_at: null,
        sync_progress: null,
      },
      {
        platform: 'mailchimp',
        status: 'disconnected',
        connected_at: null,
        last_synced_at: null,
        sync_progress: null,
      },
    ],
  });
});

// POST /api/integrations/:platform/connect - Start OAuth flow
router.post('/:platform/connect', (req, res) => {
  const { platform } = req.params;
  res.json({
    success: true,
    message: `Successfully initiated connection to ${platform}`,
    data: {
      platform,
      status: 'pending',
      connected_at: new Date().toISOString(),
      last_synced_at: null,
      sync_progress: 0,
    },
  });
});

// DELETE /api/integrations/:platform - Disconnect platform
router.delete('/:platform', (req, res) => {
  const { platform } = req.params;
  res.json({
    success: true,
    message: `Successfully disconnected from ${platform}`,
    data: {
      platform,
      status: 'disconnected',
      connected_at: null,
      last_synced_at: null,
      sync_progress: null,
    },
  });
});

export default router;
