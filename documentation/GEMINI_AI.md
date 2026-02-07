# Google Gemini AI Integration Documentation

This document describes the AI-powered recommendation engine integrated into the Marketing Intelligence Platform.

---

## Overview

The Gemini AI integration analyzes your marketing channel performance data and generates actionable recommendations with estimated financial impact. It:

- **Analyzes channel performance** (revenue, spend, ROI, conversions)
- **Detects channel synergies** (channels that work well together)
- **Generates AI-powered recommendations** (scale, optimize, or stop)
- **Calculates confidence scores** (0-100) for each recommendation
- **Estimates financial impact** for data-driven decisions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Gemini AI Integration                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ Channel      │──▶│ Gemini       │──▶│ AI               │ │
│  │ Performance  │   │ AI Engine    │   │ Recommendations  │ │
│  └──────────────┘   └──────────────┘   └──────────────────┘ │
│         │                                        │          │
│         ▼                                        ▼          │
│  ┌──────────────┐                       ┌───────────────┐   │
│  │ Synergy      │                       │ Database      │   │
│  │ Detection    │                       │ Storage       │   │
│  └──────────────┘                       └───────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `src/config/gemini.config.ts` | API client configuration |
| `src/services/gemini.service.ts` | Core AI service (analysis, recommendations) |
| `src/jobs/gemini.job.ts` | Background job for scheduled analysis |
| `src/routes/analytics.ts` | API endpoints |
| `database/migrations/002_ai_recommendations.sql` | Database schema |

---

## API Endpoints

### GET /api/analytics/performance
Returns channel performance data with ROI and ratings.

### GET /api/analytics/synergies
Returns detected channel synergies.

### GET /api/analytics/recommendations
Returns active AI-powered recommendations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "scale",
      "channel": "Facebook + Email",
      "action": "Email Facebook clickers within 24 hours",
      "reason": "5x synergy detected",
      "estimated_impact": 50000,
      "confidence_score": 95,
      "priority": "high"
    }
  ],
  "totalImpact": 69000
}
```

### POST /api/analytics/recommendations/generate
Manually triggers AI recommendation generation.

---

## Configuration

Add to your `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Without a valid API key, the system uses fallback rule-based recommendations.

---

## Recommendation Types

| Type | Description | Example Action |
|------|-------------|----------------|
| **scale** | Increase budget for high performers | "Increase Facebook budget by 20%" |
| **optimize** | Improve underperforming channels | "Improve landing pages" |
| **stop** | Cut spending on failing channels | "Cut Instagram Ads budget" |

---

## Background Job

The `gemini-recommendations` job runs daily at 2:00 AM (Asia/Manila timezone) to refresh recommendations for all users.

**Manual Trigger:**
```bash
curl -X POST http://localhost:3001/api/analytics/recommendations/generate
```

---

## Confidence Scoring

| Score | Meaning |
|-------|---------|
| 90-100 | Very high confidence, strong data support |
| 70-89 | High confidence, good data |
| 50-69 | Medium confidence, some uncertainty |
| 0-49 | Low confidence, limited data |

---

## Database Schema

```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT,           -- 'scale', 'optimize', 'stop'
  channel TEXT,
  action TEXT,
  reason TEXT,
  estimated_impact DECIMAL,
  confidence_score INTEGER,
  priority TEXT,       -- 'high', 'medium', 'low'
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

---

## Fallback Logic

When the Gemini API is unavailable, the system uses rule-based fallback:

1. **Scale**: Channels with "Exceptional" or "Excellent" rating
2. **Optimize**: Channels with "Satisfactory" or "Poor" rating  
3. **Stop**: Channels with "Failing" rating (negative ROI)
4. **Synergy**: Top detected channel combination
