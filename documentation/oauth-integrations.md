# OAuth Integrations — Technical Documentation

This document covers how the Marketing Intelligence Platform connects to external platforms (GA4, Meta, Stripe, PayPal) using OAuth, fetches historical data, and stores it for attribution analysis.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [OAuth Flow Walkthrough](#oauth-flow-walkthrough)
3. [Platform Setup Guides](#platform-setup-guides)
4. [Token Management](#token-management)
5. [Data Sync Pipeline](#data-sync-pipeline)
6. [Rate Limiting & Error Handling](#rate-limiting--error-handling)
7. [API Endpoints](#api-endpoints)
8. [Environment Variables](#environment-variables)
9. [Database Tables](#database-tables)

---

## Architecture Overview

The integration system is built with a **class-based service pattern**. Each platform has its own OAuth service that extends a shared base class.

```
BaseOAuthService (abstract)
├── GoogleAnalyticsService    — Google OAuth 2.0
├── MetaService               — Facebook Graph API OAuth
├── StripeService              — Stripe Connect OAuth
└── PayPalService              — PayPal Identity OAuth
```

**Key components:**

| Component | File | Purpose |
|-----------|------|---------|
| Base OAuth Service | `services/oauth/BaseOAuthService.ts` | Shared logic: state encoding, token expiry checks, retry |
| OAuth Repository | `services/oauth/OAuthRepository.ts` | Database CRUD with AES-256-GCM token encryption |
| Service Factory | `services/oauth/OAuthServiceFactory.ts` | Returns the correct service for a given platform |
| Platform Services | `services/platforms/*.service.ts` | Fetch historical data from each platform's API |
| Sync Service | `services/sync.service.ts` | Orchestrates data fetching and storage into `raw_events` |
| Connection Service | `services/connection.service.ts` | Manages connection status in `platform_connections` |

---

## OAuth Flow Walkthrough

Here's what happens when a user connects a platform:

### Step 1: User Clicks "Connect"

The frontend calls:
```
POST /api/integrations/:platform/connect
```

The backend generates an authorization URL with a **state parameter** that contains:
```json
{
  "userId": "user-uuid",
  "platform": "google_analytics_4",
  "nonce": "random-uuid",
  "timestamp": 1707350400000
}
```

This state is base64url-encoded to prevent CSRF attacks. It expires after 10 minutes.

### Step 2: User Authorizes on Platform

The user is redirected to the platform's authorization page (Google, Meta, PayPal). They log in and grant permissions.

### Step 3: Platform Redirects Back

The platform redirects to:
```
GET /api/oauth/callback?code=AUTH_CODE&state=ENCODED_STATE
```

The callback handler:
1. Decodes the state to identify the platform and user
2. Exchanges the authorization code for access/refresh tokens
3. Encrypts tokens with AES-256-GCM before storing in the database
4. Triggers a background historical data sync
5. Redirects the user back to the frontend integrations page

### Step 4: Background Data Sync

The sync service:
1. Sets the connection status to `syncing`
2. Fetches the last 90 days of historical data from the platform API
3. Inserts events into the `raw_events` table in batches of 500
4. For payment platforms (Stripe/PayPal), triggers attribution matching
5. Sets the connection status back to `connected`

---

## Platform Setup Guides

### Google Analytics 4

**Console:** https://console.cloud.google.com/apis/credentials

1. Create a project in Google Cloud Console
2. Enable the **Google Analytics Data API** and **Google Analytics Admin API**
3. Go to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add `http://localhost:3001/api/oauth/callback` as an authorized redirect URI
6. Copy the Client ID and Client Secret to your `.env` file

**Scopes requested:** `analytics.readonly`

**Token behavior:**
- Access tokens expire after 1 hour
- Refresh tokens are long-lived (require `prompt: consent` and `access_type: offline`)
- Token revocation is supported

**Data fetched:**
- Sessions by channel group (daily)
- Traffic sources by source/medium (daily)
- Page views, conversions, total users

---

### Meta (Facebook / Instagram)

**Console:** https://developers.facebook.com/apps

1. Create an app in Meta for Developers (type: Business)
2. Add the **Marketing API** product
3. Go to **Settings > Basic** to get your App ID and App Secret
4. Add `http://localhost:3001/api/oauth/callback` as a valid OAuth redirect URI
5. Copy App ID and App Secret to your `.env` file

**Scopes requested:** `ads_read`, `business_management`, `instagram_basic`, `instagram_manage_insights`

**Token behavior:**
- Short-lived token (2 hours) is automatically exchanged for a long-lived token (60 days)
- Long-lived tokens can be refreshed before expiry by exchanging again
- No traditional refresh token — the access token itself is re-exchanged
- Token revocation deletes all permissions

**Data fetched:**
- Campaign insights (impressions, clicks, spend, CPC, CPM, CTR)
- Actions and action values per campaign
- Daily breakdown with pagination

---

### Stripe

**Console:** https://dashboard.stripe.com/apikeys

Stripe uses an **API key** rather than an OAuth redirect flow. Users provide their Stripe Secret Key directly.

1. Log in to your Stripe Dashboard
2. Go to **Developers > API Keys**
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Enter it in the platform's integration settings

**How it works:**
- The API key is validated by calling `stripe.balance.retrieve()`
- If valid, it's stored as the access token (encrypted in the database)
- Stripe API keys don't expire, so no refresh logic is needed

**Data fetched:**
- Charges (amount, currency, status, customer, receipt email)
- Payment intents (amount, status, metadata)
- Customers (email, name, phone)

---

### PayPal

**Console:** https://developer.paypal.com/dashboard/applications

1. Log in to PayPal Developer Dashboard
2. Create an app under **Apps & Credentials**
3. Select **Sandbox** or **Live** environment
4. Copy the Client ID and Client Secret to your `.env` file
5. Add `http://localhost:3001/api/oauth/callback` as a return URL

**Scopes requested:** `https://uri.paypal.com/services/reporting/search/read`

**Token behavior:**
- Access tokens expire (typically 8 hours)
- Refresh tokens are provided for long-lived access
- Uses HTTP Basic Auth (`client_id:client_secret`) for token requests
- Token revocation is supported via the `/terminate` endpoint

**Environment switching:**
- Development uses PayPal Sandbox (`api-m.sandbox.paypal.com`)
- Production uses live API (`api-m.paypal.com`)
- Controlled by `NODE_ENV` environment variable

**Data fetched:**
- Transaction history (amount, currency, status, payer email)
- Fee amounts and currency codes
- Cart/item details
- Queries are split into 31-day windows (PayPal API limit)

---

## Token Management

### Encryption

All tokens are encrypted before database storage using **AES-256-GCM**:

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** PBKDF2 from `TOKEN_ENCRYPTION_KEY` environment variable
- **Format stored:** `encrypted:iv:authTag` (all base64-encoded)
- **Implementation:** `utils/encryption.ts`

### Token Refresh

The `BaseOAuthService.ensureValidToken()` method handles automatic refresh:

1. Retrieves the connection from the database
2. Checks if the access token is expired (with a 5-minute buffer)
3. If expired, calls the platform-specific `refreshToken()` method
4. Saves the new tokens to the database (encrypted)
5. Returns the updated connection

Each platform handles refresh differently:

| Platform | Refresh Method |
|----------|---------------|
| GA4 | Standard OAuth 2.0 refresh token grant |
| Meta | Exchange current long-lived token for a new one |
| Stripe | API keys don't expire — no refresh needed |
| PayPal | Standard OAuth 2.0 refresh token grant with Basic Auth |

### Token Lifecycle

```
Connect → Token Exchange → Encrypt → Store in DB
                                         ↓
API Call → Decrypt → Check Expiry → Refresh if needed → Use token
                                         ↓
Disconnect → Revoke with platform → Delete from DB
```

---

## Data Sync Pipeline

After a platform is connected, data flows through this pipeline:

```
Platform API → Platform Service → Sync Service → raw_events table
                                       ↓
                              Attribution Service (for payment platforms)
                                       ↓
                              verified_conversions table
```

### How it works:

1. **Trigger:** Automatic after OAuth callback, or manual via `POST /api/sync/:platform`
2. **Date range:** Last 90 days by default
3. **Fetching:** Each platform service handles its own pagination and rate limiting
4. **Storage:** Events are inserted into `raw_events` in batches of 500
5. **Attribution:** Payment platform data (Stripe/PayPal) triggers attribution matching against pixel events

### raw_events format:

Every event from every platform is stored in a uniform format:

```json
{
  "user_id": "user-uuid",
  "platform": "meta",
  "event_type": "meta_campaign_insights",
  "event_data": { "campaign_name": "...", "spend": 100, "clicks": 50 },
  "timestamp": "2026-02-01T00:00:00Z"
}
```

### Event types by platform:

| Platform | Event Types |
|----------|------------|
| GA4 | `ga4_sessions`, `ga4_traffic_source` |
| Meta | `meta_campaign_insights` |
| Stripe | `stripe_charge`, `stripe_payment_intent`, `stripe_customer` |
| PayPal | `paypal_transaction` |

---

## Rate Limiting & Error Handling

### Outgoing API Rate Limiting

All platform API calls use exponential backoff with jitter (`utils/retry.ts`):

- **Max retries:** 3
- **Initial delay:** 1,000ms
- **Max delay:** 30,000ms
- **Retryable status codes:** 429, 500, 502, 503
- **Retry-After header:** Respected when present (overrides calculated delay)

Platform-specific rate limiting:
- **Meta:** 500ms pause between ad accounts and between paginated requests
- **PayPal:** 2,000ms pause between 31-day date chunks, 1,000ms between pages

### Incoming Request Rate Limiting

The pixel tracking endpoint uses `express-rate-limit`:
- **Window:** 60 seconds
- **Max requests:** 100 per IP

### Error Handling

- **Global error handler** (`middleware/error-handler.middleware.ts`) catches all unhandled errors
- **asyncHandler** wrapper converts rejected promises to Express errors
- **Sync errors** set the connection status to `error` without crashing the server
- **OAuth errors** redirect the user back to the frontend with an error message

---

## API Endpoints

### Integration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/integrations` | List all platforms with connection status |
| `POST` | `/api/integrations/:platform/connect` | Start OAuth flow (returns auth URL) |
| `POST` | `/api/integrations/:platform/connect/api-key` | Connect via API key (Stripe only) |
| `DELETE` | `/api/integrations/:platform` | Disconnect and revoke access |

### OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/oauth/callback` | OAuth callback (handles all platforms) |

### Data Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sync/status` | Get sync status for all connected platforms |
| `POST` | `/api/sync/:platform` | Trigger manual data re-sync |

### Example: Connect Google Analytics 4

```bash
# 1. Start OAuth flow
curl -X POST http://localhost:3001/api/integrations/google_analytics_4/connect

# Response:
# { "success": true, "data": { "type": "oauth", "authUrl": "https://accounts.google.com/..." } }

# 2. User visits authUrl, authorizes, gets redirected to callback

# 3. Check connection status
curl http://localhost:3001/api/integrations

# 4. Check sync status
curl http://localhost:3001/api/sync/status
```

### Example: Connect Stripe (API Key)

```bash
# 1. Connect with API key
curl -X POST http://localhost:3001/api/integrations/stripe/connect/api-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk_test_..."}'

# Response:
# { "success": true, "message": "Stripe connected successfully. Syncing historical data..." }
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `FRONTEND_URL` | Yes | Frontend URL for OAuth redirects |
| `TOKEN_ENCRYPTION_KEY` | Yes | 32-byte key for AES-256-GCM token encryption |
| `OAUTH_REDIRECT_URI` | Yes | OAuth callback URL (default: `http://localhost:3001/api/oauth/callback`) |
| `GOOGLE_OAUTH_CLIENT_ID` | For GA4 | Google Cloud OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | For GA4 | Google Cloud OAuth client secret |
| `META_OAUTH_APP_ID` | For Meta | Meta/Facebook app ID |
| `META_OAUTH_APP_SECRET` | For Meta | Meta/Facebook app secret |
| `STRIPE_SECRET_KEY` | For Stripe | Stripe API secret key (server-side) |
| `PAYPAL_OAUTH_CLIENT_ID` | For PayPal | PayPal app client ID |
| `PAYPAL_OAUTH_CLIENT_SECRET` | For PayPal | PayPal app client secret |
| `NODE_ENV` | No | `development` (default) or `production` — controls PayPal sandbox vs live |

---

## Database Tables

### `platform_connections`

Stores OAuth connections and encrypted tokens for each user-platform pair.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `users(id)` |
| `platform` | TEXT | Platform identifier |
| `status` | TEXT | `connected`, `disconnected`, `syncing`, `error`, `pending` |
| `access_token` | TEXT | AES-256-GCM encrypted access token |
| `refresh_token` | TEXT | AES-256-GCM encrypted refresh token |
| `token_expires_at` | TIMESTAMPTZ | When the access token expires |
| `platform_account_id` | TEXT | Platform-specific account ID |
| `metadata` | JSONB | Platform-specific metadata (scopes, ad accounts, etc.) |
| `connected_at` | TIMESTAMPTZ | When the user connected |
| `last_synced_at` | TIMESTAMPTZ | Last successful data sync |

**Unique constraint:** `(user_id, platform)` — one connection per platform per user.

### `raw_events`

Stores all fetched data from all platforms in a uniform format.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `users(id)` |
| `platform` | TEXT | Source platform |
| `event_type` | TEXT | Event type (e.g., `stripe_charge`, `meta_campaign_insights`) |
| `event_data` | JSONB | Full event payload |
| `timestamp` | TIMESTAMPTZ | When the event occurred |
| `created_at` | TIMESTAMPTZ | When we stored it |

**Indexes:** `(user_id, platform)`, `(timestamp)`
