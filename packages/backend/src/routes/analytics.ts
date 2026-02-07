import { Router } from 'express';

const router = Router();

// GET /api/analytics/performance - Get channel performance data
router.get('/performance', (req, res) => {
  res.json({
    success: true,
    data: [
      { channel: 'Email', revenue: 40000, spend: 1000, roi: 3900, performance: 'Exceptional' },
      { channel: 'Facebook', revenue: 35000, spend: 5000, roi: 600, performance: 'Excellent' },
      { channel: 'Google Ads', revenue: 25000, spend: 8000, roi: 212, performance: 'Satisfactory' },
      { channel: 'Instagram Bio', revenue: 12000, spend: 0, roi: Infinity, performance: 'Exceptional' },
      { channel: 'Instagram Ads', revenue: 2000, spend: 4000, roi: -50, performance: 'Failing' }
    ]
  });
});

// GET /api/analytics/synergies - Get channel synergy data
router.get('/synergies', (req, res) => {
  res.json({
    success: true,
    data: [
      { channel_a: 'Facebook', channel_b: 'Email', synergy_score: 5.0, frequency: 45 },
      { channel_a: 'Facebook', channel_b: 'Google', synergy_score: 2.5, frequency: 45 },
      { channel_a: 'Email', channel_b: 'Purchase', synergy_score: 3.2, frequency: 70 }
    ]
  });
});

// GET /api/analytics/recommendations - Get AI recommendations
router.get('/recommendations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        type: 'scale',
        channel: 'Facebook + Email',
        action: 'Email Facebook clickers within 24 hours',
        reason: '5x synergy detected',
        estimated_impact: 50000,
        confidence: 95,
        priority: 'high'
      },
      {
        type: 'optimize',
        channel: 'Google Ads',
        action: 'Reduce cost or improve landing pages',
        reason: 'Low ROI (212%) but captures 45% of Facebook viewers',
        estimated_impact: 15000,
        confidence: 80,
        priority: 'medium'
      },
      {
        type: 'stop',
        channel: 'Instagram Ads',
        action: 'Cut Instagram Ads budget',
        reason: 'Isolated (96% alone), losing money (-50% ROI)',
        estimated_impact: 4000,
        confidence: 95,
        priority: 'high'
      }
    ]
  });
});

export default router;
