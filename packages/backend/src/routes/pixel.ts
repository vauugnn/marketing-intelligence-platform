import { Router } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
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
router.options('/generate', cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
router.post('/generate', cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }), authMiddleware, async (req, res) => {
  try {
    const userId = req.userId!;
    const pixelId = await pixelService.getOrCreatePixel(userId);

    res.json({
      success: true,
      data: {
        pixel_id: pixelId,
        snippet: `<script src="${process.env.PIXEL_URL || 'http://localhost:3002'}/track.js" data-pixel-id="${pixelId}" data-api-url="${process.env.BACKEND_URL || 'http://localhost:3001'}/api/pixel/track"></script>`
      }
    });
  } catch (error) {
    console.error('Pixel generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve or generate pixel'
    });
  }
});

// POST /api/pixel/track - Receive pixel events
// CORS: allow any origin (customer websites embed the pixel cross-origin)
const pixelCors: cors.CorsOptions = {
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
router.options('/track', cors(pixelCors), (_req, res) => res.sendStatus(204));
router.post('/track', cors(pixelCors), trackRateLimiter, async (req, res) => {
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
