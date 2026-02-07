# Multi-Platform OAuth Integration - Developer Guide

**Version:** 1.0
**Last Updated:** February 7, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Platforms](#supported-platforms)
4. [OAuth Flow](#oauth-flow)
5. [Database Schema](#database-schema)
6. [Configuration](#configuration)
7. [API Endpoints](#api-endpoints)
8. [Service Layer](#service-layer)
9. [Historical Data Sync](#historical-data-sync)
10. [Rate Limiting & Retry Logic](#rate-limiting--retry-logic)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Adding New Platforms](#adding-new-platforms)

---

## Overview

The Multi-Platform OAuth Integration system enables users to connect their marketing tools (Google Analytics 4, Meta, Stripe, PayPal) to the Marketing Intelligence Platform. Upon connection, the system automatically pulls 90 days of historical data and stores it in Supabase for cross-platform analysis.

### Key Features

- **4 Platform Integrations:** Google Analytics 4, Meta (Facebook/Instagram), Stripe, PayPal
- **Automatic Historical Data Pull:** 90 days of data fetched on connection
- **Secure Token Management:** Access/refresh tokens stored securely in Supabase
- **Graceful Rate Limiting:** Exponential backoff with retry logic
- **Background Sync:** Asynchronous data fetching doesn't block OAuth flow
- **Type-Safe:** Shared TypeScript types across frontend/backend

### Implementation Completeness

✅ OAuth flows for all 4 platforms
✅ 90-day historical data fetching
✅ Rate limiting and retry logic
✅ Database schema with proper indexes
✅ Comprehensive test coverage
✅ Frontend connection UI (basic)

---

## Architecture

### High-Level Flow

```
User clicks "Connect"
  → Frontend calls /api/integrations/:platform/connect
  → Backend generates OAuth URL with state parameter
  → User redirects to platform OAuth page
  → User authorizes app
  → Platform redirects to /api/oauth/callback
  → Backend exchanges code for tokens
  → Tokens stored in platform_connections table
  → Background sync triggered (syncHistoricalData)
  → Historical data fetched and stored in raw_events table
  → User redirected to frontend with success status
```

### Directory Structure

```
packages/backend/src/
├── config/
│   └── oauth.ts                    # OAuth client IDs, secrets, redirect URIs
├── controllers/
│   ├── oauth.controller.ts         # OAuth callback handler
│   └── integrations.controller.ts  # Connection management endpoints
├── services/
│   ├── oauth.service.ts            # Core OAuth logic (token exchange, refresh)
│   ├── connection.service.ts       # Database operations for connections
│   ├── sync.service.ts             # Historical data sync orchestrator
│   └── platforms/
│       ├── base-platform.service.ts       # Platform service interface
│       ├── google-analytics.service.ts    # GA4 implementation
│       ├── meta.service.ts                # Meta implementation
│       ├── stripe.service.ts              # Stripe implementation
│       └── paypal.service.ts              # PayPal implementation
├── utils/
│   ├── retry.ts                    # Retry logic with exponential backoff
│   └── date.ts                     # Date utilities for historical ranges
└── routes/
    ├── oauth.ts                    # OAuth routes
    └── integrations.ts             # Integration management routes
```

---

## Supported Platforms

| Platform | Auth Method | Token Expiry | Refresh Token | Historical Data |
|----------|-------------|--------------|---------------|-----------------|
| **Google Analytics 4** | OAuth2 | 1 hour | Yes | Sessions, traffic sources (90 days) |
| **Meta** | OAuth2 | 60 days | No (long-lived) | Campaign insights (90 days) |
| **PayPal** | OAuth2 | Varies | Yes | Transactions (90 days in 31-day chunks) |
| **Stripe** | API Key | N/A | N/A | Charges, payments, customers (90 days) |

### Platform-Specific Notes

#### Google Analytics 4
- Uses `offline` access type for refresh tokens
- Requires `consent` prompt to get refresh token every time
- Auto-discovers GA4 properties if `propertyId` not provided
- Fetches 2 report types: sessions and traffic sources

#### Meta (Facebook/Instagram)
- Two-step token exchange: short-lived → long-lived (60 days)
- Long-lived tokens don't have refresh tokens
- Fetches insights for all accessible ad accounts
- Daily breakdown of campaign performance

#### Stripe
- Uses API key authentication (not OAuth)
- Simpler flow: user provides API key directly
- Fetches charges, payment intents, and customer data
- Amounts converted from cents to currency units

#### PayPal
- API has 31-day maximum range per request
- 90-day range split into 3 chunks automatically
- Uses sandbox by default (check `NODE_ENV` for production)
- Fetches transaction details with payer info

---

## OAuth Flow

### 1. Initiate Connection

**Endpoint:** `POST /api/integrations/:platform/connect`

**Request:**
```typescript
// Headers
Authorization: Bearer <user_jwt_token>

// Path params
platform: 'google_analytics_4' | 'meta' | 'paypal' | 'stripe'
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Frontend Flow:**
```typescript
const response = await api.connectPlatform('google_analytics_4');
window.location.href = response.authUrl; // Redirect to OAuth page
```

### 2. OAuth Callback

**Endpoint:** `GET /api/oauth/callback`

**Query Parameters:**
```typescript
code: string        // Authorization code from platform
state: string       // Base64-encoded JSON: { platform, userId }
error?: string      // Error from platform (if authorization denied)
```

**Backend Processing:**
```typescript
1. Decode state parameter to get platform and userId
2. Exchange authorization code for access/refresh tokens
3. Calculate token expiry timestamp
4. Upsert connection in database
5. Trigger background sync (syncHistoricalData)
6. Redirect to frontend: /integrations?status=success&platform=google_analytics_4
```

### 3. Token Storage

**Table:** `platform_connections`

```sql
{
  id: UUID,
  user_id: UUID,
  platform: 'google_analytics_4' | 'meta' | 'paypal' | 'stripe',
  status: 'connected' | 'disconnected' | 'error' | 'pending' | 'syncing',
  access_token: STRING (encrypted),
  refresh_token: STRING (encrypted),
  token_expires_at: TIMESTAMP,
  platform_account_id: STRING,
  metadata: JSONB,
  connected_at: TIMESTAMP,
  last_synced_at: TIMESTAMP
}
```

### 4. Token Refresh

**Automatic Refresh:**
- Checked before each API call to platform
- If token expires within 5 minutes, refresh automatically
- Uses `refreshAccessToken()` from `oauth.service.ts`

**Manual Refresh:**
```typescript
import { OAuthService } from './services/oauth.service';

const oauthService = new OAuthService();
const newTokens = await oauthService.refreshAccessToken(
  platform,
  refreshToken
);
```

---

## Database Schema

### platform_connections

Stores OAuth credentials and connection metadata.

```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_account_id TEXT,
  metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_platform_connections_user_platform ON platform_connections(user_id, platform);
```

### raw_events

Stores historical data from all platforms.

```sql
CREATE TABLE raw_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_events_user_platform ON raw_events(user_id, platform);
CREATE INDEX idx_raw_events_timestamp ON raw_events(timestamp);
```

### Event Data Structure

Events are stored as JSONB in the `event_data` column. Structure varies by platform:

**Google Analytics 4:**
```json
{
  "date": "2026-01-15",
  "sessionSource": "google",
  "sessionMedium": "organic",
  "sessions": 150,
  "totalUsers": 120,
  "screenPageViews": 450,
  "conversions": 5
}
```

**Meta:**
```json
{
  "campaign_id": "123456789",
  "campaign_name": "Summer Sale",
  "date": "2026-01-15",
  "impressions": 10000,
  "clicks": 250,
  "spend": 150.50,
  "cpc": 0.60,
  "cpm": 15.05,
  "ctr": 2.5
}
```

**Stripe:**
```json
{
  "charge_id": "ch_abc123",
  "amount": 99.99,
  "currency": "usd",
  "status": "succeeded",
  "customer_id": "cus_xyz789",
  "payment_method": "card",
  "description": "Premium subscription"
}
```

**PayPal:**
```json
{
  "transaction_id": "TXN123",
  "amount": 49.99,
  "currency": "USD",
  "status": "Completed",
  "payer_email": "customer@example.com",
  "payer_name": "John Doe"
}
```

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Google Analytics 4
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/oauth/callback

# Meta (Facebook)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=http://localhost:3001/api/oauth/callback

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_REDIRECT_URI=http://localhost:3001/api/oauth/callback

# Stripe (API Key - no OAuth needed)
# Users provide their own API keys

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT for auth
JWT_SECRET=your-jwt-secret
```

### OAuth Configuration File

**File:** `packages/backend/src/config/oauth.ts`

```typescript
export const oauthConfig = {
  google_analytics_4: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly'
    ]
  },
  meta: {
    appId: process.env.META_APP_ID!,
    appSecret: process.env.META_APP_SECRET!,
    redirectUri: process.env.META_REDIRECT_URI!,
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: ['ads_read', 'read_insights']
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    redirectUri: process.env.PAYPAL_REDIRECT_URI!,
    authUrl: 'https://www.sandbox.paypal.com/signin/authorize',
    tokenUrl: 'https://api.sandbox.paypal.com/v1/oauth2/token',
    scopes: ['openid', 'profile', 'email']
  }
};
```

---

## API Endpoints

### Integrations Management

#### List Connections
```http
GET /api/integrations
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "platform": "google_analytics_4",
    "status": "connected",
    "connected_at": "2026-01-15T10:30:00Z",
    "last_synced_at": "2026-02-07T08:00:00Z",
    "platform_account_id": "properties/123456789"
  },
  {
    "platform": "meta",
    "status": "connected",
    "connected_at": "2026-01-16T14:20:00Z",
    "last_synced_at": "2026-02-07T08:05:00Z"
  }
]
```

#### Initiate OAuth Connection
```http
POST /api/integrations/:platform/connect
Authorization: Bearer <token>
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### Connect with API Key (Stripe only)
```http
POST /api/integrations/stripe/connect/apikey
Authorization: Bearer <token>
Content-Type: application/json

{
  "apiKey": "sk_test_..."
}
```

**Response:**
```json
{
  "message": "Stripe connected successfully",
  "platform": "stripe"
}
```

#### Disconnect Platform
```http
DELETE /api/integrations/:platform
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "google_analytics_4 disconnected successfully"
}
```

### OAuth Callback

#### Handle OAuth Redirect
```http
GET /api/oauth/callback?code=xxx&state=yyy
```

**Success Redirect:**
```
http://localhost:3000/integrations?status=success&platform=google_analytics_4
```

**Error Redirect:**
```
http://localhost:3000/integrations?status=error&platform=google_analytics_4&message=access_denied
```

---

## Service Layer

### OAuth Service

**File:** `packages/backend/src/services/oauth.service.ts`

#### Generate Auth URL
```typescript
import { OAuthService } from './services/oauth.service';

const oauthService = new OAuthService();
const authUrl = oauthService.generateAuthUrl(
  'google_analytics_4',
  'user-uuid-here'
);
```

#### Exchange Code for Tokens
```typescript
const tokens = await oauthService.exchangeCodeForTokens(
  'google_analytics_4',
  authorizationCode
);

// Returns:
// {
//   access_token: string,
//   refresh_token?: string,
//   expires_in: number
// }
```

#### Refresh Access Token
```typescript
const newTokens = await oauthService.refreshAccessToken(
  'google_analytics_4',
  refreshToken
);
```

### Platform Services

All platform services implement the `PlatformService` interface:

```typescript
interface PlatformService {
  fetchHistoricalData(
    accessToken: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<RawEventInput[]>;
}
```

#### Google Analytics Service

**File:** `packages/backend/src/services/platforms/google-analytics.service.ts`

```typescript
import { GoogleAnalyticsService } from './services/platforms/google-analytics.service';

const gaService = new GoogleAnalyticsService();
const events = await gaService.fetchHistoricalData(
  accessToken,
  new Date('2025-11-07'),
  new Date('2026-02-07'),
  'properties/123456789' // Optional: auto-discovers if not provided
);
```

#### Meta Service

**File:** `packages/backend/src/services/platforms/meta.service.ts`

```typescript
import { MetaService } from './services/platforms/meta.service';

const metaService = new MetaService();
const events = await metaService.fetchHistoricalData(
  accessToken,
  new Date('2025-11-07'),
  new Date('2026-02-07')
);
```

#### Stripe Service

**File:** `packages/backend/src/services/platforms/stripe.service.ts`

```typescript
import { StripeService } from './services/platforms/stripe.service';

const stripeService = new StripeService();
const events = await stripeService.fetchHistoricalData(
  apiKey, // Not OAuth - uses API key
  new Date('2025-11-07'),
  new Date('2026-02-07')
);
```

#### PayPal Service

**File:** `packages/backend/src/services/platforms/paypal.service.ts`

```typescript
import { PayPalService } from './services/platforms/paypal.service';

const paypalService = new PayPalService();
const events = await paypalService.fetchHistoricalData(
  accessToken,
  new Date('2025-11-07'),
  new Date('2026-02-07')
);
```

---

## Historical Data Sync

### Sync Service

**File:** `packages/backend/src/services/sync.service.ts`

The sync service orchestrates the historical data fetching process.

#### Automatic Sync (Triggered on Connection)

```typescript
// In oauth.controller.ts after token exchange
await syncService.syncHistoricalData(userId, platform);
```

#### Manual Sync

```typescript
import { SyncService } from './services/sync.service';

const syncService = new SyncService();
await syncService.syncHistoricalData('user-uuid', 'google_analytics_4');
```

### Sync Process

1. **Retrieve connection** with access token
2. **Set status to 'syncing'** in database
3. **Calculate 90-day date range** using `getHistoricalDateRange(90)`
4. **Call platform service** to fetch historical data
5. **Batch insert events** into `raw_events` table (500 events per chunk)
6. **Update connection status** to 'connected'
7. **Set last_synced_at** timestamp
8. **On error**: Set status to 'error' and log details

### Batch Insertion

```typescript
// From sync.service.ts
const BATCH_SIZE = 500;

for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await supabase.from('raw_events').insert(batch);
}
```

---

## Rate Limiting & Retry Logic

### Retry Utility

**File:** `packages/backend/src/utils/retry.ts`

#### Configuration

```typescript
interface RetryOptions {
  maxRetries?: number;      // Default: 3
  baseDelay?: number;       // Default: 1000ms
  maxDelay?: number;        // Default: 30000ms
  retryableStatusCodes?: number[]; // Default: [429, 500, 502, 503]
}
```

#### Usage

```typescript
import { withRetry } from '../utils/retry';

const data = await withRetry(
  async () => {
    const response = await axios.get('https://api.example.com/data');
    return response.data;
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    retryableStatusCodes: [429, 500, 502, 503]
  }
);
```

#### How It Works

1. **Exponential Backoff:** Delay = min(baseDelay * 2^attempt, maxDelay)
2. **Jitter:** Adds random delay (0-500ms) to prevent thundering herd
3. **Retry-After Header:** Respects platform-specified retry delays
4. **Status Code Filtering:** Only retries on specific HTTP status codes

**Example Delays:**
- Attempt 1: 1000ms + jitter
- Attempt 2: 2000ms + jitter
- Attempt 3: 4000ms + jitter
- Max delay capped at 30000ms

### Platform-Specific Rate Limiting

#### Google Analytics
```typescript
// Uses withRetry() wrapper for all API calls
const response = await withRetry(async () => {
  return await analyticsDataClient.runReport(request);
});
```

#### Meta
```typescript
// 500ms pause between ad account requests
for (const account of adAccounts) {
  const insights = await fetchInsights(account);
  await sleep(500);
}

// 500ms pause between paginated requests
while (hasNextPage) {
  const page = await fetchNextPage();
  await sleep(500);
}
```

#### PayPal
```typescript
// 2000ms pause between 31-day chunks
for (const chunk of dateChunks) {
  const transactions = await fetchTransactions(chunk);
  await sleep(2000);
}

// 1000ms pause between paginated requests
while (hasNextPage) {
  const page = await fetchNextPage();
  await sleep(1000);
}
```

#### Stripe
```typescript
// Uses Stripe SDK's built-in rate limiting
// SDK automatically handles 429 errors with exponential backoff
```

---

## Testing

### Test Files

The implementation includes comprehensive test coverage:

```
packages/backend/src/
├── services/
│   ├── oauth.service.test.ts
│   ├── connection.service.test.ts
│   ├── sync.service.test.ts
│   └── platforms/
│       ├── google-analytics.service.test.ts
│       ├── meta.service.test.ts
│       ├── stripe.service.test.ts
│       └── paypal.service.test.ts
├── controllers/
│   └── integrations.controller.test.ts
└── utils/
    ├── date.test.ts
    └── retry.test.ts
```

### Running Tests

```bash
# Run all tests
cd packages/backend
npm test

# Run specific test file
npm test oauth.service.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Configuration

**File:** `packages/backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts'
  ]
};
```

### Example Test: OAuth Service

```typescript
import { OAuthService } from './oauth.service';

describe('OAuthService', () => {
  let oauthService: OAuthService;

  beforeEach(() => {
    oauthService = new OAuthService();
  });

  it('should generate auth URL with correct parameters', () => {
    const authUrl = oauthService.generateAuthUrl('google_analytics_4', 'user-123');

    expect(authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain('client_id=');
    expect(authUrl).toContain('scope=');
    expect(authUrl).toContain('state=');
  });

  it('should exchange code for tokens', async () => {
    const tokens = await oauthService.exchangeCodeForTokens(
      'google_analytics_4',
      'test-code'
    );

    expect(tokens).toHaveProperty('access_token');
    expect(tokens).toHaveProperty('expires_in');
  });
});
```

### Manual Testing

#### 1. Test OAuth Flow

```bash
# Start backend
cd packages/backend
npm run dev

# Start frontend
cd packages/frontend
npm run dev

# Navigate to: http://localhost:3000/integrations
# Click "Connect" on any platform
# Complete OAuth flow
# Verify connection appears as "Connected"
```

#### 2. Test Historical Data Sync

```sql
-- Check platform_connections table
SELECT
  platform,
  status,
  connected_at,
  last_synced_at
FROM platform_connections
WHERE user_id = 'your-user-id';

-- Check raw_events table
SELECT
  platform,
  event_type,
  COUNT(*) as event_count,
  MIN(timestamp) as earliest_event,
  MAX(timestamp) as latest_event
FROM raw_events
WHERE user_id = 'your-user-id'
GROUP BY platform, event_type;
```

#### 3. Test Token Refresh

```typescript
// Force token expiry
UPDATE platform_connections
SET token_expires_at = NOW() - INTERVAL '1 hour'
WHERE platform = 'google_analytics_4';

// Trigger sync - should auto-refresh token
await syncService.syncHistoricalData(userId, 'google_analytics_4');

// Verify new expiry time
SELECT token_expires_at FROM platform_connections
WHERE platform = 'google_analytics_4';
```

---

## Troubleshooting

### Common Issues

#### 1. OAuth Redirect URI Mismatch

**Error:**
```
redirect_uri_mismatch
```

**Solution:**
- Ensure `.env` `REDIRECT_URI` matches platform OAuth settings exactly
- Check for trailing slashes
- Verify http vs https
- For Google: Add URI to "Authorized redirect URIs" in Google Cloud Console
- For Meta: Add URI to "Valid OAuth Redirect URIs" in Meta App Dashboard

#### 2. Token Expired / Invalid

**Error:**
```
401 Unauthorized - Invalid token
```

**Solution:**
```typescript
// Check token expiry
SELECT
  platform,
  token_expires_at,
  token_expires_at < NOW() as is_expired
FROM platform_connections;

// Manual refresh
const oauthService = new OAuthService();
const newTokens = await oauthService.refreshAccessToken(
  platform,
  refreshToken
);
```

#### 3. Rate Limit Exceeded

**Error:**
```
429 Too Many Requests
```

**Solution:**
- Retry logic should handle this automatically
- Check `Retry-After` header
- Increase delays between requests in platform services
- For Meta: Reduce concurrent account fetching
- For PayPal: Increase chunk delay from 2000ms

#### 4. Historical Sync Stuck in 'syncing' Status

**Symptom:** Connection status shows 'syncing' for hours

**Solution:**
```sql
-- Check for errors in logs
SELECT * FROM platform_connections
WHERE status = 'syncing'
AND updated_at < NOW() - INTERVAL '1 hour';

-- Manually reset status
UPDATE platform_connections
SET status = 'error'
WHERE id = 'stuck-connection-id';

-- Retry sync
await syncService.syncHistoricalData(userId, platform);
```

#### 5. No Data Fetched (0 events)

**Possible Causes:**
- Date range has no data on platform
- Platform account has no activity
- Incorrect property/account ID
- Missing permissions/scopes

**Debug Steps:**
```typescript
// Enable debug logging
const events = await platformService.fetchHistoricalData(
  accessToken,
  startDate,
  endDate
);
console.log(`Fetched ${events.length} events for platform`);

// Check date range
import { getHistoricalDateRange } from './utils/date';
const { startDate, endDate } = getHistoricalDateRange(90);
console.log(`Fetching from ${startDate} to ${endDate}`);

// Verify account ID
SELECT platform_account_id FROM platform_connections
WHERE platform = 'google_analytics_4';
```

#### 6. Stripe API Key Invalid

**Error:**
```
Invalid API Key provided
```

**Solution:**
- Ensure API key starts with `sk_test_` (test) or `sk_live_` (production)
- Check for leading/trailing spaces
- Verify key hasn't been rolled/deleted in Stripe Dashboard
- Test key with Stripe CLI: `stripe customers list --api-key sk_test_...`

---

## Adding New Platforms

Want to add HubSpot, Mailchimp, or Google Ads? Follow these steps:

### 1. Create Platform Service

```typescript
// packages/backend/src/services/platforms/hubspot.service.ts

import { PlatformService, RawEventInput } from './base-platform.service';
import axios from 'axios';
import { withRetry } from '../../utils/retry';

export class HubSpotService implements PlatformService {
  async fetchHistoricalData(
    accessToken: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): Promise<RawEventInput[]> {
    const events: RawEventInput[] = [];

    // Fetch data from HubSpot API
    const response = await withRetry(async () => {
      return await axios.get('https://api.hubapi.com/analytics/v2/reports', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          start: startDate.getTime(),
          end: endDate.getTime()
        }
      });
    });

    // Transform to RawEventInput format
    for (const item of response.data.results) {
      events.push({
        event_type: 'email_campaign',
        event_data: {
          campaign_id: item.id,
          campaign_name: item.name,
          sent: item.counters.sent,
          delivered: item.counters.delivered,
          opens: item.counters.open,
          clicks: item.counters.click
        },
        timestamp: new Date(item.created)
      });
    }

    return events;
  }
}
```

### 2. Add OAuth Configuration

```typescript
// packages/backend/src/config/oauth.ts

export const oauthConfig = {
  // ... existing configs
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID!,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
    redirectUri: process.env.HUBSPOT_REDIRECT_URI!,
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['analytics.read', 'content']
  }
};
```

### 3. Update OAuth Service

```typescript
// packages/backend/src/services/oauth.service.ts

async exchangeCodeForTokens(platform: string, code: string) {
  // ... existing platforms

  if (platform === 'hubspot') {
    const config = oauthConfig.hubspot;
    const response = await axios.post(config.tokenUrl, {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };
  }
}
```

### 4. Update Sync Service

```typescript
// packages/backend/src/services/sync.service.ts

import { HubSpotService } from './platforms/hubspot.service';

async syncHistoricalData(userId: string, platform: string) {
  let platformService: PlatformService;

  switch (platform) {
    case 'hubspot':
      platformService = new HubSpotService();
      break;
    // ... existing platforms
  }

  // ... rest of sync logic
}
```

### 5. Add Environment Variables

```bash
# .env
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
HUBSPOT_REDIRECT_URI=http://localhost:3001/api/oauth/callback
```

### 6. Update Frontend

```typescript
// packages/frontend/src/pages/Integrations.tsx

const platforms = [
  // ... existing platforms
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Email campaigns and CRM data',
    icon: '🟠'
  }
];
```

### 7. Write Tests

```typescript
// packages/backend/src/services/platforms/hubspot.service.test.ts

import { HubSpotService } from './hubspot.service';

describe('HubSpotService', () => {
  it('should fetch historical email campaign data', async () => {
    const service = new HubSpotService();
    const events = await service.fetchHistoricalData(
      'test-token',
      new Date('2025-11-07'),
      new Date('2026-02-07')
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].event_type).toBe('email_campaign');
  });
});
```

---

## Security Best Practices

### 1. Token Storage

✅ **Do:**
- Store tokens in database with encryption at rest (Supabase handles this)
- Use environment variables for OAuth secrets
- Never log access tokens or refresh tokens
- Strip tokens from API responses to frontend

❌ **Don't:**
- Store tokens in localStorage or cookies
- Commit OAuth secrets to git
- Return tokens in API responses
- Share tokens across users

### 2. State Parameter

The `state` parameter prevents CSRF attacks:

```typescript
// Encode userId and platform into state
const state = Buffer.from(
  JSON.stringify({ platform, userId })
).toString('base64');

// Verify state on callback
const decoded = JSON.parse(
  Buffer.from(state, 'base64').toString()
);
```

### 3. Redirect URI Validation

- Use exact match for redirect URIs (no wildcards)
- Use HTTPS in production
- Whitelist specific paths only

### 4. Scope Minimization

Request only necessary scopes:

```typescript
// Good: Minimal scopes
scopes: ['analytics.readonly']

// Bad: Excessive scopes
scopes: ['analytics.edit', 'analytics.manage.users', 'analytics.provision']
```

---

## Performance Optimization

### 1. Batch Processing

Insert events in batches to reduce database round-trips:

```typescript
const BATCH_SIZE = 500;
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await supabase.from('raw_events').insert(batch);
}
```

### 2. Async Background Sync

Don't block OAuth callback waiting for sync:

```typescript
// In oauth.controller.ts
await connectionService.upsertConnection(/* ... */);

// Fire and forget - don't await
syncService.syncHistoricalData(userId, platform);

// Immediately redirect user
res.redirect(`${FRONTEND_URL}/integrations?status=success`);
```

### 3. Connection Pooling

Reuse database connections:

```typescript
// Use Supabase client singleton
import { supabase } from '../config/supabase';

// Don't create new clients per request
```

### 4. Caching

Cache platform account IDs to avoid discovery on every sync:

```typescript
// Store in metadata
await connectionService.upsertConnection({
  platform_account_id: propertyId,
  metadata: {
    account_name: 'My Analytics Property',
    discovered_at: new Date()
  }
});
```

---

## Monitoring & Logging

### Key Metrics to Track

1. **Connection Success Rate:**
   ```sql
   SELECT
     platform,
     COUNT(*) FILTER (WHERE status = 'connected') * 100.0 / COUNT(*) as success_rate
   FROM platform_connections
   GROUP BY platform;
   ```

2. **Sync Duration:**
   ```sql
   SELECT
     platform,
     AVG(EXTRACT(EPOCH FROM (last_synced_at - connected_at))) as avg_sync_seconds
   FROM platform_connections
   WHERE status = 'connected'
   GROUP BY platform;
   ```

3. **Event Volume:**
   ```sql
   SELECT
     platform,
     COUNT(*) as total_events,
     COUNT(DISTINCT user_id) as unique_users
   FROM raw_events
   GROUP BY platform;
   ```

### Error Logging

```typescript
// In sync.service.ts
try {
  await syncHistoricalData(userId, platform);
} catch (error) {
  console.error(`[Sync Error] Platform: ${platform}, User: ${userId}`, {
    error: error.message,
    stack: error.stack,
    timestamp: new Date()
  });

  // Update connection status
  await connectionService.updateStatus(userId, platform, 'error');
}
```

---

## References

### Official Documentation

- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [Stripe API](https://stripe.com/docs/api)
- [PayPal API](https://developer.paypal.com/api/rest/)

### Related Files

- [HLD.txt](./HLD.txt) - High-Level Design Document
- [OAuth-Integration-Guide.md](./OAuth-Integration-Guide.md) - This document
- [packages/backend/README.md](../packages/backend/README.md) - Backend setup guide

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-07 | Initial documentation for OAuth integration system |

---

**Questions or Issues?**
Contact the development team or file an issue in the project repository.
