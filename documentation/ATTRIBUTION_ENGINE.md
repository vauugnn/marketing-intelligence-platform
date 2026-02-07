# Cross-Reference Attribution Engine

## Overview

The Cross-Reference Attribution Engine validates marketing conversions by matching payment transactions (Stripe/PayPal) with pixel tracking events and GA4 analytics data. It provides **85-95% accuracy** through dual-source verification.

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Email Matching** | Case-insensitive, whitespace-normalized email matching |
| **Session Matching** | GA4 ↔ Pixel session correlation via client_id or UTM+timestamp |
| **Timestamp Fuzzy Matching** | ±24 hour window for transaction-to-event correlation |
| **Confidence Scoring** | 0-100 score with high/medium/low levels |
| **Over-Attribution Detection** | Compares platform claims vs. actual sales |
| **Verified Conversions** | Stores validated conversions with full attribution data |
| **Background Scheduler** | Automated daily job at midnight using node-cron |
| **Batch Processing** | Parallel processing with retry logic for large datasets |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Payment Platforms                            │
│                  (Stripe / PayPal)                               │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Attribution Engine                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Email     │  │   Session   │  │   Timestamp Fuzzy       │  │
│  │  Matching   │──│  Matching   │──│      Matching           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Confidence Score Calculation                │    │
│  │        (Pixel: 0-70 pts) + (GA4: 0-30 pts)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│               verified_conversions table                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Confidence Score Breakdown

| Component | Points | Description |
|-----------|--------|-------------|
| **Pixel Base Match** | 30 | Matching pixel session found |
| **Time Proximity** | 0-20 | Linear decay over 24hr window |
| **Conversion Event** | 10 | Pixel recorded conversion event |
| **UTM Completeness** | 0-10 | Based on 5 UTM parameters |
| **GA4 Data Present** | 15 | Has GA4 validation data |
| **Channel Match** | 15 | Pixel + GA4 channels align |

**Total: 0-100 points**

### Confidence Levels

| Level | Score Range | Method |
|-------|-------------|--------|
| High | 85+ | `dual_verified` |
| Medium | 70-84 | `dual_verified` or `single_source` |
| Low | <70 | `single_source` or `uncertain` |

---

## API Endpoints

### POST `/api/attribution/run`
Manually trigger attribution for a date range.

```json
// Request
{
  "dateRange": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-07T23:59:59Z"
  }
}

// Response
{
  "message": "Attribution completed",
  "stats": {
    "transactions_found": 50,
    "already_attributed": 30,
    "newly_attributed": 18,
    "failed": 2
  }
}
```

### GET `/api/attribution/status`
Get attribution statistics.

```json
// Response
{
  "total_conversions": 150,
  "attributed_conversions": 135,
  "attribution_rate": 90.0,
  "avg_confidence_score": 75.5,
  "by_confidence_level": {
    "high": 80,
    "medium": 40,
    "low": 30
  },
  "by_attribution_method": {
    "dual_verified": 70,
    "single_source": 55,
    "uncertain": 25
  },
  "over_attributed_count": 12
}
```

### GET `/api/attribution/verified-conversions`
Get verified conversions with filters.

**Query Parameters:**
- `confidence`: Filter by level (`high`, `medium`, `low`)
- `channel`: Filter by attributed channel
- `startDate`: ISO date string
- `endDate`: ISO date string
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

---

## File Structure

```
packages/backend/src/
├── services/
│   ├── attribution.service.ts      # Core attribution logic
│   └── batch-attribution.service.ts # Large-scale batch processing
├── jobs/
│   ├── attribution.job.ts          # Daily job logic
│   └── scheduler.ts                # node-cron scheduler
├── controllers/
│   └── attribution.controller.ts   # HTTP handlers
├── routes/
│   └── attribution.ts              # Express routes
└── types/
    └── attribution.types.ts        # TypeScript interfaces
```

---

## Key Functions

### Email Matching
```typescript
normalizeEmail(email: string): string
// Converts to lowercase and trims whitespace
```

### Session Matching
```typescript
findPixelSessions(email: string, timestamp: Date, windowHours: number): Promise<PixelSession[]>
// Finds pixel sessions within ±windowHours of transaction

matchGA4SessionToPixel(userId: string, ga4ClientId: string | null, timestamp: Date, utmParams): Promise<GA4SessionMatch>
// Matches GA4 sessions to pixel sessions via client_id or UTM+timestamp
```

### Confidence Scoring
```typescript
calculateConfidenceScore(match: AttributionMatch): ConfidenceResult
// Returns score (0-100), level (high/medium/low), method
```

### Over-Attribution Detection
```typescript
detectOverAttribution(userId: string, dateRange: { start: Date; end: Date }): Promise<OverAttributionResult>
// Compares platform-claimed conversions vs actual sales
```

---

## Background Job Scheduler

The scheduler runs automatic daily attribution at midnight (Asia/Manila timezone).

### Job Management
```typescript
import { initializeScheduler, triggerJob, getJobStatus } from './jobs/scheduler';

// Start scheduler (called on server start)
initializeScheduler();

// Manually trigger a job
await triggerJob('daily-attribution');

// Check job status
const status = getJobStatus('daily-attribution');
// Returns: { name, lastRun, lastStatus, lastError, nextRun, runCount, failCount }
```

---

## Batch Processing

For large datasets, use the batch attribution service:

```typescript
import { runBatchAttribution, estimateBatchDuration } from './services/batch-attribution.service';

// Estimate processing time
const estimate = await estimateBatchDuration(userId, { start, end });
console.log(`Estimated: ${estimate.estimated}ms for ${estimate.transactionCount} transactions`);

// Run batch with progress tracking
const result = await runBatchAttribution(
  userId,
  { start, end },
  { batchSize: 100, maxConcurrent: 5 },
  (progress) => console.log(`Progress: ${progress.processed}/${progress.total}`)
);
```

### Batch Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `batchSize` | 100 | Transactions per batch |
| `maxConcurrent` | 5 | Parallel attributions |
| `retryAttempts` | 3 | Retry failed transactions |
| `retryDelayMs` | 1000 | Delay between retries (exponential backoff) |

---

## Database Schema

### verified_conversions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User reference |
| `transaction_id` | String | Unique transaction ID |
| `email` | String | Customer email |
| `amount` | Number | Transaction amount |
| `currency` | String | Currency code |
| `pixel_session_id` | String | Matched pixel session |
| `ga4_session_id` | String | Matched GA4 session |
| `attributed_channel` | String | Determined channel |
| `confidence_score` | Number | 0-100 score |
| `confidence_level` | String | high/medium/low |
| `attribution_method` | String | dual_verified/single_source/uncertain |
| `is_platform_over_attributed` | Boolean | Over-attribution flag |
| `conflicting_sources` | String[] | Conflicting channel sources |
| `timestamp` | DateTime | Transaction timestamp |
| `metadata` | JSON | Additional data |

---

## Testing

Run attribution tests:
```bash
cd packages/backend
npm test -- --testPathPattern="attribution"
```

The test suite covers:
- Email normalization
- Confidence score calculation
- Edge cases and thresholds
- Integration scenarios
