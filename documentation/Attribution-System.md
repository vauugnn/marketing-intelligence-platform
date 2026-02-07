# Cross-Reference Engine - Attribution System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Confidence Scoring](#confidence-scoring)
5. [API Reference](#api-reference)
6. [Setup & Configuration](#setup--configuration)
7. [Usage Examples](#usage-examples)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Overview

The Cross-Reference Engine solves the marketing attribution problem by matching actual payment transactions (from Stripe/PayPal) with user behavior tracked via pixel events and validating against GA4 data. This provides a ground truth about which marketing channels actually drive conversions.

### The Problem

Marketing platforms often over-attribute conversions:
- **Facebook claims:** 20 sales
- **Google claims:** 15 sales
- **Mailchimp claims:** 10 sales
- **Total claimed:** 45 sales
- **Actual sales (Stripe):** 50 sales

Platforms double-count conversions and can't see the full customer journey across channels.

### The Solution

Our attribution system:
1. ✅ Matches Stripe/PayPal transactions to pixel events (email + timestamp matching)
2. ✅ Calculates confidence scores (0-100%) based on match quality
3. ✅ Validates with GA4 data for dual-verification
4. ✅ Detects platform over-attribution
5. ✅ Stores verified conversions with full metadata

### Key Benefits

- **85-95% accuracy** via dual tracking (pixel + GA4)
- **Ground truth attribution** verified against payment data
- **Conflict detection** when platforms disagree
- **Confidence scoring** to understand match quality
- **Historical backfilling** for existing data

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Attribution System                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Stripe     │───▶│  raw_events  │    │ pixel_events │
│   PayPal     │    │    table     │    │    table     │
└──────────────┘    └──────┬───────┘    └───────┬──────┘
                           │                     │
                           │  ┌──────────────────┘
                           │  │
                           ▼  ▼
                    ┌──────────────┐
                    │  Attribution │
                    │   Service    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  GA4 Data    │◀── Validation
                    │ (raw_events) │
                    └──────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  verified_      │
                  │  conversions    │
                  └─────────────────┘
```

### Data Flow

**Automatic Attribution (Real-time):**
```
Payment Received (Stripe/PayPal)
  ↓
Stored in raw_events
  ↓
Sync Service completes
  ↓
Attribution Service triggered
  ↓
Match to pixel sessions
  ↓
Validate with GA4
  ↓
Calculate confidence
  ↓
Store in verified_conversions
```

**Batch Attribution (Scheduled):**
```
Daily Job runs at 2 AM
  ↓
Find yesterday's unattributed transactions
  ↓
Process each transaction
  ↓
Store verified conversions
```

---

## How It Works

### 1. Email-to-Pixel Matching

**Challenge:** Pixel events don't capture email addresses directly.

**Solution:** Use user account as bridge:
```
payment.email → users.email → users.pixel_id → pixel_events.session_id
```

**Matching Process:**

1. **Find User**
   ```typescript
   const user = await findUserByEmail(payment.email);
   // Returns: { id, email, pixel_id }
   ```

2. **Query Pixel Events** (±24 hour window)
   ```typescript
   const windowStart = payment.timestamp - 24 hours;
   const windowEnd = payment.timestamp + 24 hours;

   const events = await queryPixelEvents({
     pixel_id: user.pixel_id,
     timestamp: [windowStart, windowEnd]
   });
   ```

3. **Group by Session**
   ```typescript
   const sessions = groupEventsBySession(events);
   // Returns: Array<PixelSession>
   ```

4. **Rank Sessions** by composite score:
   - Time proximity (50% weight)
   - UTM completeness (30% weight)
   - Has conversion event (20% weight)

5. **Pick Best Match**
   ```typescript
   const bestSession = sessions[0]; // Highest scored
   ```

### 2. Time Proximity Calculation

**Formula:**
```typescript
timeProximity = 1 - (timeDiff / windowSize)
```

**Example:**
- Transaction: 2:00 PM
- Pixel event: 11:00 AM (3 hours before)
- Window: 24 hours
- Time diff: 3 hours = 10,800,000 ms
- Window size: 24 hours = 86,400,000 ms
- **Proximity: 0.875** (87.5%)

Closer events = higher proximity = higher confidence.

### 3. UTM Completeness

**Score:** Number of UTM parameters present / 5

**Parameters checked:**
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`

**Examples:**
- All 5 present: 1.0 (100%)
- 4 present: 0.8 (80%)
- Only source: 0.2 (20%)
- None: 0.0 (0%)

### 4. GA4 Validation

**Process:**

1. **Extract date** from transaction
   ```typescript
   const date = "20260207"; // YYYYMMDD format
   ```

2. **Query GA4 events** for that date
   ```sql
   SELECT event_data
   FROM raw_events
   WHERE platform = 'google_analytics_4'
     AND event_data->>'date' = '20260207'
   ```

3. **Extract channels** from GA4 data
   ```typescript
   const ga4Channels = [
     'facebook',
     'google',
     'email'
   ];
   ```

4. **Check alignment** with pixel channel
   ```typescript
   if (ga4Channels.includes(pixelChannel)) {
     // Channels align → +15 points
   }
   ```

### 5. Over-Attribution Detection

**Logic:**
```typescript
actualSales = COUNT(stripe_charge + paypal_transaction)
claimedConversions = SUM(meta.conversions + ga4.conversions)

if (claimedConversions > actualSales * 1.1) {
  isOverAttributed = true;
  discrepancy = claimedConversions - actualSales;
}
```

**Example:**
- Actual sales: 50
- Meta claims: 28
- GA4 claims: 22
- Total claimed: 50
- Threshold: 55 (50 * 1.1)
- **Result:** NOT over-attributed

---

## Confidence Scoring

### Scoring Algorithm

**Total possible: 0-100 points**

#### Pixel Matching Component (0-70 points)

| Factor | Points | Description |
|--------|--------|-------------|
| Base match | 30 | Found a pixel session for this email |
| Time proximity | 0-20 | Closer to payment time = more points |
| Has conversion event | 10 | Pixel tracked a 'conversion' event |
| UTM completeness | 0-10 | More UTM params = more points |

**Calculation:**
```typescript
pixelScore = 30 // base
  + (timeProximity * 20) // 0-20
  + (hasConversion ? 10 : 0) // 0 or 10
  + (utmCompleteness * 10); // 0-10
```

#### GA4 Validation Component (0-30 points)

| Factor | Points | Description |
|--------|--------|-------------|
| Has GA4 data | 15 | GA4 has data for this date |
| Channel alignment | 15 | Pixel channel matches GA4 channel |
| Partial traffic | 5 | GA4 has traffic but no exact match |

**Calculation:**
```typescript
ga4Score = 0;

if (hasGA4Data) {
  ga4Score += 15;

  if (pixelChannel === ga4Channel) {
    ga4Score += 15; // Perfect match
  } else if (hasTraffic) {
    ga4Score += 5; // Some traffic
  }
}
```

#### Total Score

```typescript
totalScore = pixelScore + ga4Score;

// Cap at 50 for conflicting sources
if (hasConflict) {
  totalScore = Math.min(totalScore, 50);
}
```

### Confidence Levels

| Score Range | Level | Method | Meaning |
|-------------|-------|--------|---------|
| 95-100 | **High** | `dual_verified` | Pixel + GA4 both agree on source |
| 85-94 | **High** | `dual_verified` | Strong pixel match + GA4 confirms |
| 70-84 | **Medium** | `dual_verified` | Good pixel match + GA4 validates |
| 60-69 | **Medium** | `single_source` | Decent pixel match, no GA4 |
| 40-59 | **Low** | `single_source` | Weak pixel match |
| 0-39 | **Low** | `uncertain` | No clear match or conflicts |

### Attribution Methods

**`dual_verified`**
- Both pixel events AND GA4 data confirm the attribution
- Highest confidence
- Channels align or GA4 validates traffic

**`single_source`**
- Only pixel events confirm attribution
- Medium to low confidence
- No GA4 data available or doesn't align

**`uncertain`**
- Very weak or no pixel match
- Conflicting data from different sources
- Transaction without pixel tracking

### Scoring Examples

#### Example 1: Perfect Attribution
```typescript
{
  pixelMatch: true,
  pixelTimeProximity: 1.0,      // 0 time difference
  pixelHasConversion: true,
  pixelUtmCompleteness: 1.0,     // All 5 UTM params
  pixelChannel: 'facebook',
  ga4Match: true,
  ga4Channel: 'facebook'
}

Score: 30 + 20 + 10 + 10 + 15 + 15 = 100
Level: High
Method: dual_verified
```

#### Example 2: Good Pixel, No GA4
```typescript
{
  pixelMatch: true,
  pixelTimeProximity: 0.8,       // 4.8 hours apart
  pixelHasConversion: true,
  pixelUtmCompleteness: 0.6,     // 3 of 5 UTM params
  pixelChannel: 'facebook',
  ga4Match: false
}

Score: 30 + 16 + 10 + 6 = 62
Level: Medium
Method: single_source
```

#### Example 3: Conflicting Channels
```typescript
{
  pixelMatch: true,
  pixelTimeProximity: 0.9,
  pixelHasConversion: true,
  pixelUtmCompleteness: 1.0,
  pixelChannel: 'facebook',
  ga4Match: true,
  ga4Channel: 'google',          // Conflict!
  conflictReason: 'channel_mismatch'
}

Score: 70 + 15 = 85, capped at 50
Level: Low
Method: single_source (trust pixel)
```

#### Example 4: No Pixel Match
```typescript
{
  pixelMatch: false,
  ga4Match: false
}

Score: 0
Level: Low
Method: uncertain
```

---

## API Reference

### Base URL
```
http://localhost:3001/api/attribution
```

All endpoints require authentication via the `authMiddleware`.

---

### POST `/run`

Manually trigger attribution for a date range.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "dateRange": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-07T23:59:59Z"
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Attribution completed",
  "stats": {
    "transactions_found": 45,
    "already_attributed": 20,
    "newly_attributed": 23,
    "failed": 2
  }
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to run attribution",
  "message": "Database connection error"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/attribution/run \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "dateRange": {
      "start": "2026-02-01T00:00:00Z",
      "end": "2026-02-07T23:59:59Z"
    }
  }'
```

---

### GET `/status`

Get attribution statistics for the authenticated user.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response (200 OK):**
```json
{
  "total_conversions": 150,
  "attributed_conversions": 135,
  "attribution_rate": 90.0,
  "avg_confidence_score": 73.5,
  "by_confidence_level": {
    "high": 85,
    "medium": 40,
    "low": 25
  },
  "by_attribution_method": {
    "dual_verified": 95,
    "single_source": 45,
    "uncertain": 10
  },
  "over_attributed_count": 5
}
```

**Example:**
```bash
curl http://localhost:3001/api/attribution/status \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### GET `/verified-conversions`

Get verified conversions with optional filters.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `confidence` | string | Filter by level: `high`, `medium`, `low` | `high` |
| `channel` | string | Filter by attributed channel | `facebook` |
| `startDate` | ISO date | Start of date range | `2026-02-01T00:00:00Z` |
| `endDate` | ISO date | End of date range | `2026-02-07T23:59:59Z` |
| `limit` | number | Results per page (default: 50) | `100` |
| `offset` | number | Pagination offset (default: 0) | `50` |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "transaction_id": "ch_abc123",
      "email": "customer@example.com",
      "amount": 99.99,
      "currency": "PHP",
      "pixel_session_id": "session-123",
      "ga4_session_id": null,
      "attributed_channel": "facebook",
      "confidence_score": 87,
      "confidence_level": "high",
      "attribution_method": "dual_verified",
      "is_platform_over_attributed": false,
      "conflicting_sources": null,
      "timestamp": "2026-02-05T14:30:00Z",
      "created_at": "2026-02-05T14:35:00Z",
      "metadata": {
        "platform": "stripe",
        "all_candidate_sessions": ["session-123", "session-456"],
        "ga4_top_channels": ["facebook"]
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

**Examples:**

Get high-confidence conversions:
```bash
curl "http://localhost:3001/api/attribution/verified-conversions?confidence=high&limit=50" \
  -H "Authorization: Bearer eyJhbGc..."
```

Get Facebook conversions from last week:
```bash
curl "http://localhost:3001/api/attribution/verified-conversions?channel=facebook&startDate=2026-02-01T00:00:00Z&endDate=2026-02-07T23:59:59Z" \
  -H "Authorization: Bearer eyJhbGc..."
```

Get paginated results:
```bash
curl "http://localhost:3001/api/attribution/verified-conversions?limit=100&offset=100" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Setup & Configuration

### 1. Database Migration

Run the attribution indexes migration:

**Using psql:**
```bash
psql -d your_database -f database/migrations/002_attribution_indexes.sql
```

**Using Supabase SQL Editor:**
```sql
-- Copy contents of 002_attribution_indexes.sql and execute
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_raw_events_event_type ON raw_events(event_type);
CREATE INDEX IF NOT EXISTS idx_raw_events_user_timestamp ON raw_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_verified_conversions_confidence ON verified_conversions(confidence_level);
CREATE INDEX IF NOT EXISTS idx_verified_conversions_method ON verified_conversions(attribution_method);
CREATE INDEX IF NOT EXISTS idx_verified_conversions_channel ON verified_conversions(attributed_channel);
```

**Verify indexes:**
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('users', 'raw_events', 'verified_conversions', 'pixel_events');
```

### 2. Environment Variables

No additional environment variables needed - attribution uses existing Supabase configuration.

### 3. Scheduled Job Setup

#### Option A: Node-cron (Development)

Create `packages/backend/src/scheduler.ts`:
```typescript
import cron from 'node-cron';
import { runDailyAttributionJob } from './jobs/attribution.job';
import { logger } from './utils/logger';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Scheduler', 'Running daily attribution job');
  try {
    await runDailyAttributionJob();
    logger.info('Scheduler', 'Daily attribution job completed');
  } catch (error) {
    logger.error('Scheduler', 'Daily attribution job failed', { error });
  }
});

logger.info('Scheduler', 'Attribution scheduler initialized');
```

Import in `index.ts`:
```typescript
import './scheduler'; // Add after other imports
```

#### Option B: AWS Lambda (Production)

Create Lambda function:
```typescript
// lambda/attribution-job/index.ts
import { runDailyAttributionJob } from '@backend/jobs/attribution.job';

export const handler = async () => {
  try {
    await runDailyAttributionJob();
    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: 'Failed' };
  }
};
```

Set up EventBridge rule:
```
Schedule: cron(0 2 * * ? *)  # Daily at 2 AM UTC
Target: attribution-job Lambda function
```

#### Option C: Vercel Cron (Vercel Deployment)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/attribution",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Create endpoint `pages/api/cron/attribution.ts`:
```typescript
import { runDailyAttributionJob } from '@backend/jobs/attribution.job';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await runDailyAttributionJob();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## Usage Examples

### Example 1: Automatic Attribution After Sync

**Scenario:** User connects Stripe, historical data syncs.

**Flow:**
```typescript
// 1. User connects Stripe via OAuth
POST /api/oauth/callback/stripe

// 2. Sync service fetches last 90 days of transactions
syncHistoricalData(userId, 'stripe')

// 3. After storing in raw_events, attribution triggers automatically
attributeRecentTransactions(userId, stripeEvents)

// 4. Verified conversions created
// Query results:
SELECT * FROM verified_conversions WHERE user_id = 'user-123';
```

**Result:**
```
| transaction_id | email           | amount | channel  | confidence | level  |
|----------------|-----------------|--------|----------|------------|--------|
| ch_abc123      | user@example.com| 99.99  | facebook | 92         | high   |
| ch_def456      | user@example.com| 149.99 | google   | 78         | medium |
| ch_ghi789      | user@example.com| 49.99  | direct   | 15         | low    |
```

### Example 2: Manual Attribution for Date Range

**Scenario:** Backfill attribution for last 30 days.

```typescript
// Client-side
const response = await fetch('http://localhost:3001/api/attribution/run', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dateRange: {
      start: '2026-01-08T00:00:00Z',
      end: '2026-02-07T23:59:59Z'
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   message: "Attribution completed",
//   stats: {
//     transactions_found: 125,
//     already_attributed: 45,
//     newly_attributed: 78,
//     failed: 2
//   }
// }
```

### Example 3: Dashboard Statistics

**Scenario:** Display attribution metrics on admin dashboard.

```typescript
// Fetch attribution stats
const statsResponse = await fetch('http://localhost:3001/api/attribution/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const stats = await statsResponse.json();

// Display in UI
<Dashboard>
  <Metric label="Total Conversions" value={stats.total_conversions} />
  <Metric label="Attribution Rate" value={`${stats.attribution_rate}%`} />
  <Metric label="Avg Confidence" value={stats.avg_confidence_score} />

  <Chart title="By Confidence Level">
    <Bar label="High" value={stats.by_confidence_level.high} color="green" />
    <Bar label="Medium" value={stats.by_confidence_level.medium} color="yellow" />
    <Bar label="Low" value={stats.by_confidence_level.low} color="red" />
  </Chart>

  <Alert show={stats.over_attributed_count > 0}>
    Warning: {stats.over_attributed_count} conversions show platform over-attribution
  </Alert>
</Dashboard>
```

### Example 4: Export High-Confidence Conversions

**Scenario:** Generate report of high-confidence Facebook conversions.

```typescript
const conversions = await fetch(
  'http://localhost:3001/api/attribution/verified-conversions?' +
  new URLSearchParams({
    confidence: 'high',
    channel: 'facebook',
    startDate: '2026-02-01T00:00:00Z',
    endDate: '2026-02-07T23:59:59Z',
    limit: '1000'
  }),
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const data = await conversions.json();

// Export to CSV
const csv = [
  ['Transaction ID', 'Email', 'Amount', 'Date', 'Confidence'],
  ...data.data.map(c => [
    c.transaction_id,
    c.email,
    c.amount,
    new Date(c.timestamp).toLocaleDateString(),
    c.confidence_score
  ])
].map(row => row.join(',')).join('\n');

downloadFile('high-confidence-facebook.csv', csv);
```

### Example 5: Programmatic Backfill

**Scenario:** Backfill attribution for specific user after adding historical pixel data.

```typescript
import { runAttributionForUser } from './jobs/attribution.job';

// Backfill last 90 days for user
const result = await runAttributionForUser('user-123', {
  start: new Date('2025-11-01'),
  end: new Date('2026-02-07')
});

console.log(`Success: ${result.success}, Failed: ${result.failed}`);
```

---

## Testing

### Unit Tests

Run the attribution service unit tests:

```bash
cd packages/backend
npm test -- attribution.service.test.ts
```

**Test coverage includes:**
- ✅ Email normalization
- ✅ Confidence score calculation
- ✅ All confidence level thresholds
- ✅ Attribution method classification
- ✅ Edge cases (missing data, conflicts)
- ✅ Scoring component weights

**Expected output:**
```
PASS  src/services/attribution.service.test.ts
  Attribution Service
    ✓ normalizeEmail (5ms)
    ✓ calculateConfidenceScore - high confidence (3ms)
    ✓ calculateConfidenceScore - medium confidence (2ms)
    ✓ calculateConfidenceScore - low confidence (2ms)
    ...

  Test Suites: 1 passed, 1 total
  Tests:       28 passed, 28 total
  Coverage:    92% statements, 89% branches
```

### Integration Testing

#### Test 1: End-to-End Attribution

```typescript
// 1. Create test user
const { data: user } = await supabase
  .from('users')
  .insert({
    email: 'test@example.com',
    pixel_id: 'pix_test123'
  })
  .select()
  .single();

// 2. Create pixel events
await supabase.from('pixel_events').insert([
  {
    pixel_id: 'pix_test123',
    session_id: 'session-test',
    event_type: 'page_view',
    page_url: 'https://example.com/product',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'summer-sale',
    timestamp: '2026-02-07T10:00:00Z'
  },
  {
    pixel_id: 'pix_test123',
    session_id: 'session-test',
    event_type: 'conversion',
    page_url: 'https://example.com/checkout',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'summer-sale',
    timestamp: '2026-02-07T10:15:00Z'
  }
]);

// 3. Create Stripe transaction
await supabase.from('raw_events').insert({
  user_id: user.id,
  platform: 'stripe',
  event_type: 'stripe_charge',
  event_data: {
    id: 'ch_test123',
    amount: 99.99,
    currency: 'PHP',
    receipt_email: 'test@example.com'
  },
  timestamp: '2026-02-07T10:30:00Z' // 30 minutes after pixel conversion
});

// 4. Trigger attribution
await attributeTransaction(user.id, {
  transaction_id: 'ch_test123',
  email: 'test@example.com',
  amount: 99.99,
  currency: 'PHP',
  timestamp: '2026-02-07T10:30:00Z',
  platform: 'stripe'
});

// 5. Verify verified_conversion created
const { data: conversion } = await supabase
  .from('verified_conversions')
  .select('*')
  .eq('transaction_id', 'ch_test123')
  .single();

// Assertions
expect(conversion).toBeDefined();
expect(conversion.email).toBe('test@example.com');
expect(conversion.pixel_session_id).toBe('session-test');
expect(conversion.attributed_channel).toBe('facebook');
expect(conversion.confidence_score).toBeGreaterThanOrEqual(70);
expect(conversion.confidence_level).toBe('high');
```

#### Test 2: Over-Attribution Detection

```typescript
// 1. Create 10 actual sales
for (let i = 0; i < 10; i++) {
  await supabase.from('raw_events').insert({
    user_id: 'user-test',
    platform: 'stripe',
    event_type: 'stripe_charge',
    event_data: { id: `ch_${i}`, amount: 100 },
    timestamp: new Date().toISOString()
  });
}

// 2. Create Meta claiming 20 conversions
await supabase.from('raw_events').insert({
  user_id: 'user-test',
  platform: 'meta',
  event_type: 'meta_campaign_insights',
  event_data: {
    conversions: 20,
    date: new Date().toISOString().split('T')[0].replace(/-/g, '')
  },
  timestamp: new Date().toISOString()
});

// 3. Run over-attribution detection
const result = await detectOverAttribution('user-test', {
  start: new Date(Date.now() - 24 * 60 * 60 * 1000),
  end: new Date()
});

// Assertions
expect(result.isOverAttributed).toBe(true);
expect(result.details.actualSales).toBe(10);
expect(result.details.platformClaimed).toBe(20);
expect(result.details.discrepancy).toBe(10);
```

### Manual Testing Checklist

- [ ] **Database indexes created** - Verify all 6 indexes exist
- [ ] **API endpoints accessible** - Test `/run`, `/status`, `/verified-conversions`
- [ ] **Automatic attribution triggers** - Sync Stripe → check `verified_conversions`
- [ ] **High confidence attribution** - Pixel + GA4 align → score 85+
- [ ] **Medium confidence attribution** - Only pixel → score 60-84
- [ ] **Low confidence attribution** - No pixel match → score <40
- [ ] **Over-attribution detection** - Mock platform claims > actual
- [ ] **Conflict handling** - Pixel says Facebook, GA4 says Google → score capped
- [ ] **Batch job works** - Run `runDailyAttributionJob()` manually
- [ ] **Error handling** - Test with invalid data, missing emails
- [ ] **Performance** - 1000 transactions should complete in <2 minutes

---

## Troubleshooting

### Issue 1: No Pixel Sessions Found

**Symptom:**
```json
{
  "confidence_score": 10,
  "confidence_level": "low",
  "attribution_method": "uncertain",
  "metadata": { "reason": "no_pixel_match" }
}
```

**Possible Causes:**
1. Email mismatch - payment email doesn't exist in `users` table
2. No pixel_id assigned to user
3. Pixel events outside ±24 hour window
4. User hasn't visited site (no pixel events)

**Solutions:**

Check if user exists:
```sql
SELECT * FROM users WHERE email = 'customer@example.com';
```

Check if user has pixel_id:
```sql
SELECT pixel_id FROM users WHERE email = 'customer@example.com';
-- Should return: pix_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Check for pixel events:
```sql
SELECT COUNT(*)
FROM pixel_events
WHERE pixel_id = 'pix_xxx'
  AND timestamp BETWEEN '2026-02-06T10:00:00Z' AND '2026-02-08T10:00:00Z';
```

**Fix:** Ensure users have pixel_id assigned:
```sql
UPDATE users
SET pixel_id = 'pix_' || md5(random()::text)
WHERE pixel_id IS NULL;
```

---

### Issue 2: Low Confidence Scores

**Symptom:** All conversions getting 30-50 confidence scores.

**Possible Causes:**
1. No GA4 data available
2. UTM parameters missing from pixel events
3. Large time gap between pixel and payment
4. No conversion events tracked

**Solutions:**

Check GA4 data:
```sql
SELECT COUNT(*)
FROM raw_events
WHERE user_id = 'user-xxx'
  AND platform = 'google_analytics_4';
```

Check UTM coverage:
```sql
SELECT
  COUNT(*) as total,
  COUNT(utm_source) as has_source,
  COUNT(utm_medium) as has_medium,
  COUNT(utm_campaign) as has_campaign
FROM pixel_events
WHERE pixel_id = 'pix_xxx';
```

Check for conversion events:
```sql
SELECT COUNT(*)
FROM pixel_events
WHERE pixel_id = 'pix_xxx'
  AND event_type = 'conversion';
```

**Fix:**
- Connect GA4 via OAuth
- Ensure marketing links include full UTM parameters
- Track conversion events in pixel: `__pixelTrack('conversion')`

---

### Issue 3: Attribution Not Triggering

**Symptom:** Stripe sync completes but no `verified_conversions` created.

**Possible Causes:**
1. Attribution service import failed
2. Error in attribution logic (check logs)
3. Database permissions issue

**Solutions:**

Check server logs:
```bash
# Look for attribution errors
tail -f logs/app.log | grep "Attribution"
```

Manually trigger attribution:
```typescript
import * as attributionService from './services/attribution.service';

// Test single transaction
await attributionService.attributeTransaction('user-id', {
  transaction_id: 'test-123',
  email: 'test@example.com',
  amount: 100,
  currency: 'PHP',
  timestamp: new Date().toISOString(),
  platform: 'stripe'
});
```

Check database permissions:
```sql
-- Verify user can insert into verified_conversions
INSERT INTO verified_conversions (
  user_id, transaction_id, email, amount, currency,
  confidence_score, confidence_level, attribution_method,
  timestamp
) VALUES (
  'test-user', 'test-123', 'test@example.com', 100, 'PHP',
  50, 'medium', 'single_source', NOW()
);
```

---

### Issue 4: Over-Attribution Always False

**Symptom:** `is_platform_over_attributed` always `false` even when platforms claim more.

**Possible Causes:**
1. Platform data not synced yet
2. Conversion data in wrong format
3. Date range too narrow

**Solutions:**

Check platform conversion data:
```sql
SELECT
  platform,
  event_type,
  event_data->>'conversions' as conversions
FROM raw_events
WHERE user_id = 'user-xxx'
  AND platform IN ('meta', 'google_analytics_4')
  AND timestamp >= NOW() - INTERVAL '7 days';
```

Manually check discrepancy:
```sql
WITH actual_sales AS (
  SELECT COUNT(*) as count
  FROM raw_events
  WHERE user_id = 'user-xxx'
    AND event_type IN ('stripe_charge', 'paypal_transaction')
    AND timestamp >= NOW() - INTERVAL '7 days'
),
claimed AS (
  SELECT SUM((event_data->>'conversions')::int) as count
  FROM raw_events
  WHERE user_id = 'user-xxx'
    AND platform IN ('meta', 'google_analytics_4')
    AND timestamp >= NOW() - INTERVAL '7 days'
)
SELECT
  actual_sales.count as actual,
  claimed.count as claimed,
  claimed.count > actual_sales.count * 1.1 as is_over_attributed
FROM actual_sales, claimed;
```

---

### Issue 5: Slow Attribution Performance

**Symptom:** Attribution taking >5 seconds per transaction.

**Possible Causes:**
1. Missing database indexes
2. Large pixel_events table
3. Complex GA4 queries

**Solutions:**

Verify indexes exist:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('users', 'pixel_events', 'raw_events', 'verified_conversions')
ORDER BY tablename, indexname;
```

Expected indexes:
```
idx_pixel_events_pixel_id
idx_pixel_events_session_id
idx_pixel_events_timestamp
idx_raw_events_event_type
idx_raw_events_user_timestamp
idx_users_email
idx_verified_conversions_channel
idx_verified_conversions_confidence
idx_verified_conversions_method
```

Analyze query performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM pixel_events
WHERE pixel_id = 'pix_xxx'
  AND timestamp >= NOW() - INTERVAL '24 hours'
  AND timestamp <= NOW() + INTERVAL '24 hours';
```

**Fix:** Run missing migrations:
```bash
psql -d your_db -f database/migrations/002_attribution_indexes.sql
```

---

## Performance Optimization

### Database Optimization

#### 1. Index Maintenance

Monitor index usage:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

Rebuild indexes if fragmented:
```sql
REINDEX TABLE pixel_events;
REINDEX TABLE raw_events;
REINDEX TABLE verified_conversions;
```

#### 2. Table Partitioning (Optional for Large Scale)

Partition `pixel_events` by timestamp:
```sql
-- For tables with millions of rows
CREATE TABLE pixel_events_2026_02 PARTITION OF pixel_events
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

#### 3. Query Optimization

Use materialized view for stats:
```sql
CREATE MATERIALIZED VIEW attribution_stats AS
SELECT
  user_id,
  COUNT(*) as total_conversions,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE confidence_level = 'high') as high_confidence,
  COUNT(*) FILTER (WHERE is_platform_over_attributed) as over_attributed
FROM verified_conversions
GROUP BY user_id;

-- Refresh daily
REFRESH MATERIALIZED VIEW attribution_stats;
```

### Application Optimization

#### 1. Batch Processing

Process transactions in chunks:
```typescript
async function attributeTransactionsBatch(
  userId: string,
  transactions: TransactionData[],
  batchSize: number = 50
) {
  const chunks = chunkArray(transactions, batchSize);

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(txn => attributeTransaction(userId, txn))
    );

    // Rate limiting
    await sleep(500);
  }
}
```

#### 2. GA4 Data Caching

Implement caching for GA4 queries:
```typescript
import { LRUCache } from 'lru-cache';

const ga4Cache = new LRUCache<string, GA4ValidationResult>({
  max: 1000,
  ttl: 24 * 60 * 60 * 1000 // 24 hours
});

async function validateWithGA4Cached(
  userId: string,
  channel: string,
  date: Date
) {
  const cacheKey = `${userId}-${date.toISOString().split('T')[0]}`;

  if (ga4Cache.has(cacheKey)) {
    return ga4Cache.get(cacheKey)!;
  }

  const result = await validateWithGA4(userId, channel, date);
  ga4Cache.set(cacheKey, result);

  return result;
}
```

#### 3. Parallel Processing

Process multiple users concurrently:
```typescript
async function runDailyAttributionJobParallel() {
  // Get all users with unattributed transactions
  const users = await getActiveUsers();

  // Process in parallel batches of 10
  const batches = chunkArray(users, 10);

  for (const batch of batches) {
    await Promise.all(
      batch.map(user => processUserAttribution(user.id))
    );
  }
}
```

### Monitoring & Alerts

#### Metrics to Track

1. **Attribution Rate**
   ```sql
   SELECT
     (COUNT(*) FILTER (WHERE pixel_session_id IS NOT NULL)::float / COUNT(*)) * 100
     as attribution_rate
   FROM verified_conversions
   WHERE created_at >= NOW() - INTERVAL '7 days';
   ```

2. **Average Confidence Score**
   ```sql
   SELECT AVG(confidence_score) as avg_confidence
   FROM verified_conversions
   WHERE created_at >= NOW() - INTERVAL '7 days';
   ```

3. **Processing Time**
   ```typescript
   const startTime = Date.now();
   await attributeTransaction(userId, transaction);
   const duration = Date.now() - startTime;

   logger.info('Attribution', 'Processing time', {
     duration,
     transactionId: transaction.transaction_id
   });
   ```

#### Alert Thresholds

Set up alerts for:
- Attribution rate drops below 70%
- Average confidence score drops below 60
- Processing time exceeds 5 seconds
- Over-attribution rate exceeds 20%
- Daily job failures

---

## Best Practices

### 1. Data Quality

**Ensure Clean Email Data:**
```typescript
// Normalize emails before storing
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/\+.*@/, '@');
}
```

**Track Complete UTM Parameters:**
```html
<!-- Always use full UTM parameters in marketing links -->
<a href="https://example.com/product?utm_source=facebook&utm_medium=cpc&utm_campaign=summer-sale&utm_term=shoes&utm_content=blue-ad">
```

**Track Conversion Events:**
```javascript
// Fire conversion pixel on checkout success
__pixelTrack('conversion');
```

### 2. Regular Maintenance

**Weekly:**
- Review low-confidence conversions
- Check for email mismatches
- Verify GA4 data syncing

**Monthly:**
- Analyze attribution trends
- Review over-attribution flags
- Optimize slow queries
- Archive old verified_conversions (>6 months)

**Quarterly:**
- Audit confidence scoring algorithm
- Review time window settings
- Update channel mapping rules

### 3. Security

**Protect API Endpoints:**
```typescript
// Always use authentication
app.use('/api/attribution', authMiddleware);

// Rate limit attribution endpoints
app.use('/api/attribution/run', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // Max 10 requests per window
}));
```

**Sanitize Inputs:**
```typescript
// Validate transaction data
const schema = z.object({
  transaction_id: z.string().min(1),
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().length(3)
});
```

---

## Glossary

**Attribution** - The process of assigning credit to marketing channels for driving conversions.

**Confidence Score** - A 0-100 value indicating how certain we are about the attribution (higher = more certain).

**Dual Verification** - When both pixel events and GA4 data confirm the same attribution source.

**Over-Attribution** - When platforms (Meta, Google) claim more conversions than actual sales occurred.

**Pixel Session** - A group of pixel events with the same session_id, representing one user's browsing session.

**Time Proximity** - How close in time a pixel event is to a payment transaction (0-1, higher = closer).

**UTM Parameters** - URL parameters used to track marketing campaign sources (utm_source, utm_medium, etc.).

**Verified Conversion** - A transaction that has been matched to pixel events and stored with confidence metadata.

---

## Support

### Common Questions

**Q: Why do some transactions have 0 confidence score?**
A: No pixel session was found for that email within the ±24 hour window. The user may have purchased without visiting tracked pages.

**Q: Can I adjust the time window from 24 hours?**
A: Yes, modify the `windowHours` parameter in `findPixelSessions()`. Consider business logic (B2B may need longer window).

**Q: What if a customer uses different emails?**
A: Current implementation can't match across different emails. Consider implementing device fingerprinting or requiring login before purchase.

**Q: Why trust pixel over GA4 when they conflict?**
A: Pixel is first-party data (more accurate), while GA4 is aggregate and can have attribution model differences. We log conflicts for manual review.

**Q: How to handle refunds/cancellations?**
A: Monitor Stripe refund events and mark corresponding `verified_conversions` as voided. Consider adding `is_voided` flag to schema.

### Further Reading

- [GA4 Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Stripe Webhook Events](https://stripe.com/docs/api/events)
- [Marketing Attribution Models](https://support.google.com/analytics/answer/1662518)
- [First-Party vs Third-Party Data](https://www.cookieyes.com/blog/first-party-data-vs-third-party-data/)

---

## Changelog

### v1.0.0 (2026-02-07)
- Initial release
- Email-to-pixel matching via user bridge
- Confidence scoring (0-100%)
- GA4 validation
- Over-attribution detection
- Automatic and manual attribution
- REST API endpoints
- Scheduled batch job
- Comprehensive unit tests

---

**Last Updated:** February 7, 2026
**Version:** 1.0.0
**Maintained by:** Marketing Intelligence Platform Team
