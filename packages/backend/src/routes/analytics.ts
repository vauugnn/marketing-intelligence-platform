import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import {
  getChannelPerformance,
  analyzeChannelSynergies,
  generateRecommendations,
  getJourneyPatterns,
  identifyChannelRoles,
} from '../services/synergy.service';
import type { DateRange } from '@shared/types';

const router = Router();

/** Parses startDate/endDate query params, defaulting to last 30 days. */
function parseDateRange(query: Record<string, any>): DateRange {
  const end = query.endDate ? String(query.endDate) : new Date().toISOString();
  const start = query.startDate
    ? String(query.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

// GET /api/analytics/performance - Get channel performance data
router.get(
  '/performance',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query);
    const data = await getChannelPerformance(req.userId!, dateRange);
    res.json({ success: true, data });
  })
);

// GET /api/analytics/synergies - Get channel synergy data
router.get(
  '/synergies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query);
    const data = await analyzeChannelSynergies(req.userId!, dateRange);
    res.json({ success: true, data });
  })
);

// GET /api/analytics/recommendations - Get AI recommendations
router.get(
  '/recommendations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query);
    const data = await generateRecommendations(req.userId!, dateRange);
    res.json({ success: true, data });
  })
);

// GET /api/analytics/journeys - Get journey patterns
router.get(
  '/journeys',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query);
    const data = await getJourneyPatterns(req.userId!, dateRange);
    res.json({ success: true, data });
  })
);

// GET /api/analytics/channel-roles - Get channel role classifications
router.get(
  '/channel-roles',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query);
    const data = await identifyChannelRoles(req.userId!, dateRange);
    res.json({ success: true, data });
  })
);

export default router;
