# Attribution System - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Database Migration
```bash
psql -d your_database -f database/migrations/002_attribution_indexes.sql
```

### Step 2: Test the API
```bash
# Get attribution status
curl http://localhost:3001/api/attribution/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Trigger Attribution
```bash
# Run for last 7 days
curl -X POST http://localhost:3001/api/attribution/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dateRange": {"start": "2026-02-01", "end": "2026-02-07"}}'
```

---

## 📊 Understanding Confidence Scores

| Score | What It Means |
|-------|---------------|
| **95-100** | 🟢 Perfect match - pixel + GA4 both confirm same channel |
| **70-94** | 🟢 Strong match - pixel confirms, GA4 validates |
| **60-69** | 🟡 Good match - pixel only, no GA4 data |
| **40-59** | 🟠 Weak match - uncertain attribution |
| **0-39** | 🔴 Very weak or no match |

---

## 🔍 Quick Debugging

### No Pixel Match (Score = 0)
```sql
-- Check if user has pixel_id
SELECT email, pixel_id FROM users WHERE email = 'customer@example.com';

-- Check pixel events
SELECT COUNT(*) FROM pixel_events WHERE pixel_id = 'pix_xxx';
```

### Low Scores (<40)
**Common causes:**
- Missing UTM parameters
- Large time gap (>12 hours) between pixel and payment
- No GA4 data
- No conversion event tracked

**Fix:**
1. Use full UTM parameters in marketing links
2. Connect GA4 via OAuth
3. Track conversion events: `__pixelTrack('conversion')`

### Attribution Not Triggering
```typescript
// Check logs
tail -f logs/app.log | grep "Attribution"

// Manually trigger
import { attributeTransaction } from './services/attribution.service';
await attributeTransaction(userId, transactionData);
```

---

## 📈 Key Metrics to Monitor

```sql
-- Attribution rate (should be >80%)
SELECT
  (COUNT(*) FILTER (WHERE pixel_session_id IS NOT NULL)::float / COUNT(*)) * 100
FROM verified_conversions;

-- Average confidence (should be >65)
SELECT AVG(confidence_score) FROM verified_conversions;

-- Over-attribution count
SELECT COUNT(*) FROM verified_conversions WHERE is_platform_over_attributed = true;
```

---

## 🛠️ Common Tasks

### Backfill Historical Data
```typescript
import { runAttributionForUser } from './jobs/attribution.job';

await runAttributionForUser('user-123', {
  start: new Date('2026-01-01'),
  end: new Date('2026-02-07')
});
```

### Get High-Confidence Facebook Conversions
```bash
curl "http://localhost:3001/api/attribution/verified-conversions?confidence=high&channel=facebook&limit=100" \
  -H "Authorization: Bearer TOKEN"
```

### Schedule Daily Job
```typescript
import cron from 'node-cron';
import { runDailyAttributionJob } from './jobs/attribution.job';

cron.schedule('0 2 * * *', async () => {
  await runDailyAttributionJob();
});
```

---

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `attribution.service.ts` | Core matching & scoring logic |
| `attribution.controller.ts` | HTTP request handlers |
| `attribution.routes.ts` | API endpoints |
| `attribution.types.ts` | TypeScript interfaces |
| `attribution.job.ts` | Scheduled batch processing |
| `002_attribution_indexes.sql` | Database performance indexes |

---

## ⚡ Quick Reference

### Scoring Formula
```
Total Score (0-100) = Pixel Score (0-70) + GA4 Score (0-30)

Pixel Score = 30 (base)
            + (timeProximity * 20)
            + (hasConversion ? 10 : 0)
            + (utmCompleteness * 10)

GA4 Score = (hasData ? 15 : 0)
          + (channelsAlign ? 15 : 5)
```

### Time Window
- Default: ±24 hours from transaction timestamp
- Configurable via `windowHours` parameter

### Channel Mapping
Pixel `utm_source` → attributed channel:
- `facebook` → facebook
- `google` → google
- `instagram` → instagram
- `email` → email
- (none) → direct

---

## 🎯 Success Checklist

- [ ] Database indexes created
- [ ] API returns 200 for `/status`
- [ ] Attribution triggered after Stripe sync
- [ ] Confidence scores >65 on average
- [ ] Attribution rate >80%
- [ ] Scheduled job running daily
- [ ] Logs show no errors

---

## 📞 Need Help?

See full documentation: [Attribution-System.md](./Attribution-System.md)

**Common Issues:**
- No pixel match → Check `users.pixel_id` and `pixel_events`
- Low confidence → Add UTM parameters, connect GA4
- Slow performance → Verify database indexes exist
- Over-attribution always false → Check platform data synced

---

**Version:** 1.0.0 | **Last Updated:** 2026-02-07
