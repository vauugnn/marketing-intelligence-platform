/**
 * Analytics Routes
 *
 * Provides endpoints for:
 * - Channel performance data
 * - Channel synergy data
 * - AI-powered recommendations
 */

import { Router, Request, Response } from 'express';
import {
  getChannelPerformance,
  detectChannelSynergies,
  getActiveRecommendations,
  analyzeAndGenerateRecommendations,
  type ChannelPerformance,
  type ChannelSynergy,
  type AIRecommendation,
} from '../services/gemini.service';
import { logger } from '../utils/logger';

const router = Router();

// Default user ID for development (when auth is not enabled)
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo-user';

/**
 * GET /api/analytics/performance
 * Get channel performance data
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || DEFAULT_USER_ID;
    const performance = await getChannelPerformance(userId);

    // If no data, return sample data for demonstration
    if (performance.length === 0) {
      return res.json({
        success: true,
        data: getSamplePerformanceData(),
        isSampleData: true,
      });
    }

    res.json({
      success: true,
      data: performance,
      isSampleData: false,
    });
  } catch (error) {
    logger.error('AnalyticsRoutes', 'Error fetching performance', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel performance',
    });
  }
});

/**
 * GET /api/analytics/synergies
 * Get channel synergy data
 */
router.get('/synergies', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || DEFAULT_USER_ID;
    const synergies = await detectChannelSynergies(userId);

    // If no data, return sample data for demonstration
    if (synergies.length === 0) {
      return res.json({
        success: true,
        data: getSampleSynergyData(),
        isSampleData: true,
      });
    }

    res.json({
      success: true,
      data: synergies,
      isSampleData: false,
    });
  } catch (error) {
    logger.error('AnalyticsRoutes', 'Error fetching synergies', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel synergies',
    });
  }
});

/**
 * GET /api/analytics/recommendations
 * Get AI-powered recommendations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || DEFAULT_USER_ID;
    const recommendations = await getActiveRecommendations(userId);

    // If no recommendations exist, return sample data
    if (recommendations.length === 0) {
      return res.json({
        success: true,
        data: getSampleRecommendations(),
        totalImpact: 69000,
        isSampleData: true,
      });
    }

    // Calculate total impact
    const totalImpact = recommendations.reduce(
      (sum, rec) => sum + (rec.estimated_impact || 0),
      0
    );

    res.json({
      success: true,
      data: recommendations,
      totalImpact,
      isSampleData: false,
    });
  } catch (error) {
    logger.error('AnalyticsRoutes', 'Error fetching recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations',
    });
  }
});

/**
 * POST /api/analytics/recommendations/generate
 * Manually trigger AI recommendation generation
 */
router.post('/recommendations/generate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || DEFAULT_USER_ID;

    logger.info('AnalyticsRoutes', 'Manual recommendation generation triggered', { userId });

    const analysis = await analyzeAndGenerateRecommendations(userId);

    res.json({
      success: true,
      data: {
        recommendations: analysis.recommendations,
        channelPerformance: analysis.channelPerformance,
        synergies: analysis.synergies,
        totalEstimatedImpact: analysis.totalEstimatedImpact,
        analysisTimestamp: analysis.analysisTimestamp,
      },
    });
  } catch (error) {
    logger.error('AnalyticsRoutes', 'Error generating recommendations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
    });
  }
});

// Sample data functions for demonstration when no real data exists

function getSamplePerformanceData(): ChannelPerformance[] {
  return [
    { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, conversions: 25, performance_rating: 'Exceptional' },
    { channel: 'Facebook', revenue: 35000, spend: 5000, roi: 600, conversions: 20, performance_rating: 'Excellent' },
    { channel: 'Google Ads', revenue: 25000, spend: 8000, roi: 212, conversions: 15, performance_rating: 'Satisfactory' },
    { channel: 'Instagram Bio', revenue: 12000, spend: 0, roi: 9999, conversions: 8, performance_rating: 'Exceptional' },
    { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, conversions: 2, performance_rating: 'Failing' },
  ];
}

function getSampleSynergyData(): ChannelSynergy[] {
  return [
    { channel_a: 'Facebook', channel_b: 'Email', synergy_score: 5.0, frequency: 45, combined_revenue: 50000 },
    { channel_a: 'Facebook', channel_b: 'Google Ads', synergy_score: 2.5, frequency: 30, combined_revenue: 35000 },
    { channel_a: 'Email', channel_b: 'Direct', synergy_score: 3.2, frequency: 70, combined_revenue: 45000 },
  ];
}

function getSampleRecommendations(): AIRecommendation[] {
  return [
    {
      user_id: 'demo',
      type: 'scale',
      channel: 'Facebook + Email',
      action: 'Email Facebook clickers within 24 hours for maximum impact',
      reason: '5x synergy detected between Facebook and Email campaigns',
      estimated_impact: 50000,
      confidence_score: 95,
      priority: 'high',
      is_active: true,
    },
    {
      user_id: 'demo',
      type: 'optimize',
      channel: 'Google Ads',
      action: 'Reduce cost or improve landing pages',
      reason: 'Low ROI (212%) but captures 45% of Facebook viewers',
      estimated_impact: 15000,
      confidence_score: 80,
      priority: 'medium',
      is_active: true,
    },
    {
      user_id: 'demo',
      type: 'stop',
      channel: 'Instagram Ads',
      action: 'Cut Instagram Ads budget',
      reason: 'Isolated (96% alone), losing money (-50% ROI)',
      estimated_impact: 4000,
      confidence_score: 95,
      priority: 'high',
      is_active: true,
    },
  ];
}

export default router;
