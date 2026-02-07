import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/pixel/generate - Generate new pixel ID for user
router.post('/generate', (req, res) => {
  const pixelId = `pix_${uuidv4().replace(/-/g, '')}`;
  res.json({
    success: true,
    data: {
      pixel_id: pixelId,
      snippet: `<script src="${process.env.PIXEL_URL || 'http://localhost:3002'}/track.js" data-pixel-id="${pixelId}"></script>`
    }
  });
});

// POST /api/pixel/track - Receive pixel events
router.post('/track', (req, res) => {
  const event = req.body;
  console.log('Pixel event received:', event);

  // TODO: Store in database
  res.json({ success: true });
});

export default router;
