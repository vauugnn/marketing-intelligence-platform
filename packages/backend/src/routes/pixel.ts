import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pixelService } from '../services/pixel.service';
import { PixelEventSchema } from '../validators/pixel.validator';
import { z } from 'zod';

const router = Router();

// POST /api/pixel/generate - Generate new pixel ID for user
router.post('/generate', async (req, res) => {
  try {
    const pixelId = `pix_${uuidv4().replace(/-/g, '')}`;

    // TODO: If user is authenticated, associate pixel with user
    // const userId = req.user?.id;
    // if (userId) {
    //   await pixelService.associatePixelWithUser(pixelId, userId);
    // }

    res.json({
      success: true,
      data: {
        pixel_id: pixelId,
        snippet: `<script src="${process.env.PIXEL_URL || 'http://localhost:3002'}/track.js" data-pixel-id="${pixelId}"></script>`
      }
    });
  } catch (error) {
    console.error('Pixel generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate pixel'
    });
  }
});

// POST /api/pixel/track - Receive pixel events
router.post('/track', async (req, res) => {
  try {
    // Validate input
    const validatedEvent = PixelEventSchema.parse(req.body);

    // Extract IP address and user agent from request
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    // Store in database
    const result = await pixelService.storeEvent(
      validatedEvent,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      event_id: result.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Validation error
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: error.errors
      });
    }

    console.error('Pixel tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

export default router;
