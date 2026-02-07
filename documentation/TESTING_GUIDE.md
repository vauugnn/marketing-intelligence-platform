# Testing Guide: HubSpot & Mailchimp Services

## Quick Start

```bash
cd packages/backend
npm test
```

---

## Run Specific Tests

### All Email Platform Tests
```bash
npm test -- --testPathPattern="platforms"
```

### HubSpot Only
```bash
npm test -- hubspot.service.test.ts
```

### Mailchimp Only
```bash
npm test -- mailchimp.service.test.ts
```

### Watch Mode (re-run on changes)
```bash
npm test -- --watch hubspot.service.test.ts
```

---

## What the Tests Cover

### Mailchimp (`mailchimp.service.test.ts`)
| Test Case | Description |
|-----------|-------------|
| `platformName` | Verifies service identifies as "mailchimp" |
| `returns array of campaign reports` | Confirms `fetchHistoricalData` returns valid data |
| `includes mailchimp_campaign_report event type` | Validates event type |
| `includes campaign metrics in event_data` | Checks `campaign_id`, `emails_sent`, `opens`, `clicks` |
| `calculates total bounces correctly` | Hard + soft bounces = total |
| `uses sleep for rate limiting` | Ensures 300ms delay between API calls |
| `uses withRetry for API calls` | Validates retry mechanism |
| `returns empty array when no campaigns` | Edge case handling |
| `defaults to us1 data center` | Tests default behavior |

### HubSpot (`hubspot.service.test.ts`)
| Test Case | Description |
|-----------|-------------|
| `platformName` | Verifies service identifies as "hubspot" |
| `returns array of events` | Confirms `fetchHistoricalData` returns valid data |
| `includes hubspot_marketing_email event type` | Validates email event type |
| `includes hubspot_campaign event type` | Validates campaign event type |
| `includes email metrics in event_data` | Checks `email_id`, `sends`, `opens`, `clicks` |
| `includes all email statistics` | Validates actual metric values |
| `uses sleep for rate limiting` | Ensures delays between API calls |
| `uses withRetry for API calls` | Validates retry mechanism |
| `returns empty array when no emails` | Edge case handling |
| `handles emails without statistics` | Graceful fallback to 0 values |

---

## Test Output Example

```
 PASS  src/services/platforms/hubspot.service.test.ts
 PASS  src/services/platforms/mailchimp.service.test.ts

Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
```

---

## Verbose Output

For detailed test results:
```bash
npm test -- --verbose hubspot.service.test.ts mailchimp.service.test.ts
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module` | Run `npm install` first |
| Tests hang | Check for missing mock implementations |
| Unexpected failures | Run `jest --clearCache` |
