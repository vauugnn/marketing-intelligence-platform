import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pixelService } from '../services/pixel.service';
import { PixelEventSchema } from '../validators/pixel.validator';
import { z } from 'zod';

const router = Router();

// Rate limiter for /track endpoint: 100 requests per minute per IP
const trackRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

// POST /api/pixel/generate - Generate new pixel ID for user
router.post('/generate', async (req, res) => {
  try {
    const pixelId = `pix_${uuidv4().replace(/-/g, '')}`;

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
// CORS: allow any origin (customer websites embed the pixel cross-origin)
router.options('/track', cors());
router.post('/track', cors(), trackRateLimiter, async (req, res) => {
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
