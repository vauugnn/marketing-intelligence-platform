/**
 * Attribution Routes
 *
 * Express routes for attribution endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as attributionController from '../controllers/attribution.controller';

const router = Router();

/**
 * POST /api/attribution/run
 * Manually trigger attribution for a date range
 *
 * Body:
 * {
 *   "dateRange": {
 *     "start": "2026-02-01T00:00:00Z",
 *     "end": "2026-02-07T23:59:59Z"
 *   }
 * }
 */
router.post('/run', authMiddleware, asyncHandler(attributionController.runAttribution));

/**
 * GET /api/attribution/status
 * Get attribution statistics (total, by confidence level, attribution rate, etc.)
 */
router.get('/status', authMiddleware, asyncHandler(attributionController.getAttributionStatus));

/**
 * GET /api/attribution/verified-conversions
 * Get verified conversions with optional filters
 *
 * Query params:
 * - confidence: 'high' | 'medium' | 'low'
 * - channel: filter by attributed channel
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
router.get('/verified-conversions', authMiddleware, asyncHandler(attributionController.getVerifiedConversions));

export default router;
