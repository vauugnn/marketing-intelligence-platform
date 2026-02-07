import { Router } from 'express';

const router = Router();

// GET /api/integrations - List all platform connections
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      { platform: 'google_analytics_4', status: 'disconnected' },
      { platform: 'meta', status: 'disconnected' },
      { platform: 'stripe', status: 'disconnected' },
      { platform: 'paypal', status: 'disconnected' }
    ]
  });
});

// POST /api/integrations/:platform/connect - Start OAuth flow
router.post('/:platform/connect', (req, res) => {
  const { platform } = req.params;
  res.json({
    success: true,
    message: `OAuth flow for ${platform} will be implemented`,
    authUrl: '#'
  });
});

// DELETE /api/integrations/:platform - Disconnect platform
router.delete('/:platform', (req, res) => {
  const { platform } = req.params;
  res.json({
    success: true,
    message: `Disconnected from ${platform}`
  });
});

export default router;
