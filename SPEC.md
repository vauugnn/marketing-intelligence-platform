# Intelligence Platform — Spec

Single source of truth for spec-driven coding. Every endpoint, data model, hook, and integration documented with exact signatures.

---

## 1. Backend API Endpoints

All endpoints (except pixel track and OAuth callback) require `authMiddleware`. All responses use `{ success: boolean, data: T }` envelope.

### Analytics (`/api/analytics`)

| Method | Path | Query Params | Response Data |
|--------|------|-------------|---------------|
| GET | `/performance` | `startDate?`, `endDate?` (ISO, default 30d) | `ChannelPerformance[]` |
| GET | `/synergies` | `startDate?`, `endDate?` | `ChannelSynergy[]` |
| GET | `/recommendations` | `startDate?`, `endDate?` | `AIRecommendation[]` |
| GET | `/journeys` | `startDate?`, `endDate?` | `JourneyPattern[]` |
| GET | `/channel-roles` | `startDate?`, `endDate?` | `ChannelRole[]` |

### Integrations (`/api/integrations`)

| Method | Path | Params | Response Data |
|--------|------|--------|---------------|
| GET | `/` | — | `PlatformConnection[]` |
| POST | `/:platform/connect` | platform path param | `ConnectResponse` |
| POST | `/:platform/connect/api-key` | `{ api_key: string }` body | `PlatformConnection` |
| DELETE | `/:platform` | platform path param | `{ success: true }` |

### Attribution (`/api/attribution`)

| Method | Path | Params | Response Data |
|--------|------|--------|---------------|
| POST | `/run` | `{ dateRange: { start, end } }` body | attribution result |
| GET | `/status` | — | attribution status summary |
| GET | `/verified-conversions` | `confidence?`, `channel?`, `startDate?`, `endDate?`, `limit?` (50), `offset?` (0) | `VerifiedConversion[]` |

### Sync (`/api/sync`)

| Method | Path | Params | Response Data |
|--------|------|--------|---------------|
| GET | `/status` | — | `SyncStatus[]` |
| POST | `/:platform` | platform path param | `{ message: string }` |

### Pixel (`/api/pixel`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| POST | `/generate` | yes | `{ pixel_id, snippet }` |
| POST | `/track` | no (CORS open, rate-limited 100/min/IP) | `{ success, event_id }` |

### OAuth (`/api/oauth`)

| Method | Path | Flow |
|--------|------|------|
| GET | `/callback` | Receives `code` + `state` (base64url JSON), exchanges token, triggers sync, redirects to frontend |

### Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{ status: 'ok' }` |

---

## 2. Database Schema (Supabase PostgreSQL)

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| email | TEXT | UNIQUE NOT NULL |
| pixel_id | TEXT | UNIQUE |
| created_at | TIMESTAMPTZ | default NOW() |
| updated_at | TIMESTAMPTZ | default NOW() |

### platform_connections
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) ON DELETE CASCADE |
| platform | TEXT | NOT NULL |
| status | TEXT | default 'disconnected' |
| access_token | TEXT | — |
| refresh_token | TEXT | — |
| token_expires_at | TIMESTAMPTZ | — |
| platform_account_id | TEXT | — |
| metadata | JSONB | — |
| connected_at | TIMESTAMPTZ | — |
| last_synced_at | TIMESTAMPTZ | — |
| created_at | TIMESTAMPTZ | default NOW() |
| | | UNIQUE(user_id, platform) |

### raw_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) ON DELETE CASCADE |
| platform | TEXT | NOT NULL |
| event_type | TEXT | NOT NULL |
| event_data | JSONB | NOT NULL |
| timestamp | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | default NOW() |

Indexes: `(user_id, platform)`, `(timestamp)`, `(event_type)`, `(user_id, timestamp)`

### pixel_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| pixel_id | TEXT | NOT NULL |
| session_id | TEXT | NOT NULL |
| user_id | UUID | FK users(id) ON DELETE SET NULL |
| event_type | TEXT | NOT NULL |
| page_url | TEXT | NOT NULL |
| referrer | TEXT | — |
| utm_source | TEXT | — |
| utm_medium | TEXT | — |
| utm_campaign | TEXT | — |
| utm_term | TEXT | — |
| utm_content | TEXT | — |
| timestamp | TIMESTAMPTZ | NOT NULL |
| user_agent | TEXT | — |
| ip_address | INET | — |
| metadata | JSONB | — |
| dedup_key | TEXT | UNIQUE (deduplication) |
| created_at | TIMESTAMPTZ | default NOW() |

Indexes: `(pixel_id)`, `(session_id)`, `(timestamp)`, UNIQUE `(dedup_key)`

### verified_conversions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) ON DELETE CASCADE |
| transaction_id | TEXT | UNIQUE NOT NULL |
| email | TEXT | — |
| amount | DECIMAL(10,2) | NOT NULL |
| currency | TEXT | default 'PHP' |
| pixel_session_id | TEXT | — |
| ga4_session_id | TEXT | — |
| attributed_channel | TEXT | — |
| confidence_score | INTEGER | CHECK 0-100 |
| confidence_level | TEXT | CHECK IN ('high','medium','low') |
| attribution_method | TEXT | CHECK IN ('dual_verified','single_source','uncertain') |
| is_platform_over_attributed | BOOLEAN | default FALSE |
| conflicting_sources | TEXT[] | — |
| timestamp | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | default NOW() |
| metadata | JSONB | — |

Indexes: `(user_id)`, `(email)`, `(timestamp)`, `(confidence_level)`, `(attribution_method)`, `(attributed_channel)`

### ai_recommendations
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK users(id) ON DELETE CASCADE |
| type | TEXT | CHECK IN ('scale','optimize','stop') |
| channel | TEXT | NOT NULL |
| action | TEXT | NOT NULL |
| reason | TEXT | NOT NULL |
| estimated_impact | DECIMAL(12,2) | default 0 |
| confidence_score | INTEGER | CHECK 0-100 |
| priority | TEXT | CHECK IN ('high','medium','low') |
| is_active | BOOLEAN | default TRUE |
| created_at | TIMESTAMPTZ | default NOW() |
| expires_at | TIMESTAMPTZ | — |

Indexes: `(user_id)`, `(user_id, is_active) WHERE is_active = TRUE`, `(created_at)`

---

## 3. Shared Types (`@shared/types`)

```typescript
type Platform = 'google_analytics_4' | 'meta' | 'google_ads' | 'stripe' | 'paypal' | 'hubspot' | 'mailchimp' | 'pixel';
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'syncing';
type AttributionConfidence = 'high' | 'medium' | 'low';

interface User { id: string; email: string; created_at: string; pixel_id?: string; }

interface PlatformConnection {
  id: string; user_id: string; platform: Platform; status: ConnectionStatus;
  access_token?: string; refresh_token?: string; token_expires_at?: string;
  platform_account_id?: string; metadata?: Record<string, any>;
  connected_at: string; last_synced_at?: string; sync_progress?: number | null;
}

interface RawEvent {
  id: string; user_id: string; platform: Platform; event_type: string;
  event_data: Record<string, any>; timestamp: string; created_at: string;
}

interface PixelEvent {
  id: string; pixel_id: string; session_id: string; user_id?: string;
  event_type: 'page_view' | 'conversion' | 'custom'; page_url: string;
  referrer?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string;
  utm_term?: string; utm_content?: string; timestamp: string;
  user_agent?: string; ip_address?: string; metadata?: Record<string, any>;
}

interface VerifiedConversion {
  id: string; user_id: string; transaction_id: string; email?: string;
  amount: number; currency: string; pixel_session_id?: string; ga4_session_id?: string;
  attributed_channel?: string; confidence_score: number; confidence_level: AttributionConfidence;
  attribution_method: 'dual_verified' | 'single_source' | 'uncertain';
  is_platform_over_attributed: boolean; conflicting_sources?: string[];
  timestamp: string; created_at: string; metadata?: Record<string, any>;
}

interface ChannelPerformance {
  channel: string; revenue: number; spend: number; roi: number; conversions: number;
  performance_rating: 'exceptional' | 'excellent' | 'satisfactory' | 'poor' | 'failing';
}

interface ChannelSynergy {
  channel_a: string; channel_b: string;
  synergy_score: number; frequency: number; confidence: number;
}

interface AIRecommendation {
  id: string; type: 'scale' | 'optimize' | 'stop'; channel: string;
  action: string; reason: string; estimated_impact: number;
  confidence: number; priority: 'high' | 'medium' | 'low';
  ai_explanation?: string; after_implementation?: string;
  why_it_matters?: string[]; ai_enhanced?: boolean;
}

interface JourneyPattern { pattern: string[]; frequency: number; total_revenue: number; avg_revenue: number; }

interface ChannelRole {
  channel: string; primary_role: 'introducer' | 'closer' | 'supporter' | 'isolated';
  solo_conversions: number; assisted_conversions: number;
  introducer_count: number; closer_count: number; supporter_count: number;
}

interface Touchpoint {
  session_id: string; channel: string; timestamp: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; event_count: number;
}

interface ConversionJourney {
  conversion_id: string; amount: number; channel_sequence: string[];
  touchpoints: Touchpoint[]; is_multi_touch: boolean;
}

interface DateRange { start: string; end: string; }
interface ConnectResponse { type: 'oauth' | 'api_key'; authUrl?: string; message?: string; }
interface SyncStatus { platform: Platform; status: ConnectionStatus; lastSyncedAt?: string; connectedAt?: string; }
interface ApiResponse<T = any> { success: boolean; data?: T; error?: string; message?: string; }
interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; hasMore: boolean; }
```

---

## 4. Frontend API Layer (`services/api.ts`)

Base URL: `import.meta.env.VITE_API_URL || 'http://localhost:3001/api'`

```typescript
fetchApi<T>(path, options?) → Promise<T>  // throws on non-2xx or success:false

getIntegrations()          → PlatformConnection[]
connectPlatform(platform)  → ConnectResponse
disconnectPlatform(platform) → PlatformConnection
getPerformance()           → ChannelPerformance[]
getSynergies()             → ChannelSynergy[]
getRecommendations()       → AIRecommendation[]
getJourneyPatterns()       → JourneyPattern[]
getChannelRoles()          → ChannelRole[]
getSyncStatus()            → SyncStatus[]
triggerSync(platform)      → { message: string }
generatePixel()            → { pixel_id: string; snippet: string }
```

---

## 5. React Query Hooks

### `hooks/useAnalytics.ts` (all staleTime: 5 min)

| Hook | Query Key | Returns |
|------|-----------|---------|
| `usePerformance()` | `['analytics', 'performance']` | `ChannelPerformance[]` |
| `useSynergies()` | `['analytics', 'synergies']` | `ChannelSynergy[]` |
| `useRecommendations()` | `['analytics', 'recommendations']` | `AIRecommendation[]` |
| `useJourneyPatterns()` | `['analytics', 'journeys']` | `JourneyPattern[]` |
| `useChannelRoles()` | `['analytics', 'channel-roles']` | `ChannelRole[]` |

### `hooks/useIntegrations.ts`

| Hook | Type | Key / Fn | Notes |
|------|------|----------|-------|
| `usePlatforms()` | query | `['integrations', 'platforms']` | refetchInterval: 30s |
| `usePixel()` | query | `['integrations', 'pixel']` | staleTime: Infinity |
| `useConnectPlatform()` | mutation | `connectPlatform` | invalidates `['integrations']` + `['analytics']`, toast |
| `useDisconnectPlatform()` | mutation | `disconnectPlatform` | invalidates `['integrations']` + `['analytics']`, toast |

---

## 6. Frontend Pages

| Route | Page | Data Hooks |
|-------|------|------------|
| `/` | Dashboard | `usePerformance()` |
| `/integrations` | Integrations | `usePlatforms()`, `usePixel()`, `useConnectPlatform()`, `useDisconnectPlatform()` |
| `/system-map` | SystemMap | `usePerformance()`, `useSynergies()` |
| `/recommendations` | Recommendations | `useRecommendations()` |

Sidebar nav: Dashboard, Integrations, System Map, Recommendations. Hardcoded user: "John Doe".

---

## 7. OAuth Flow

**State encoding**: `base64url(JSON.stringify({ userId, platform, nonce: uuid, timestamp: Date.now() }))`
**State validation**: max age 10 minutes, platform must match.

| Platform | Service | Scopes |
|----------|---------|--------|
| `google_analytics_4` | GoogleAnalyticsService | `analytics.readonly` |
| `meta` | MetaService | `ads_read, business_management, instagram_basic, instagram_manage_insights` |
| `stripe` | StripeService | `read_only` (Stripe Connect) |
| `paypal` | PayPalService | `reporting/search/read` |
| `google_ads` | not yet implemented | — |
| `hubspot` | not yet implemented | — |
| `mailchimp` | not yet implemented | — |

Callback flow: `/api/oauth/callback` → exchange code → store tokens → trigger historical sync → redirect to `/integrations?status=connected&platform=X`

---

## 8. Gemini AI Service

**Model**: `gemini-1.5-flash` | **Temperature**: 0.7 | **Max tokens**: 2048

**Cache**: 5-minute in-memory TTL per user. Falls back to rule-based recommendations if Gemini unavailable.

**Prompt inputs**: channel performance, synergies, channel roles, top 15 journey patterns, rule-based recommendations.

**Output schema**:
```json
{
  "enhanced": [{ "id", "action", "reason", "ai_explanation", "after_implementation", "why_it_matters" }],
  "additional": [{ "type", "channel", "action", "reason", "ai_explanation", "after_implementation", "why_it_matters", "estimated_impact", "confidence", "priority" }]
}
```

Constraints: no invented data, PHP currency (₱), action < 120 chars, ai_explanation < 300 chars, 0-2 additional recs.

---

## 9. Pixel Tracking Script (`packages/pixel`)

**Build**: Webpack → `dist/track.js` (<5KB, ES2015)
**Served at**: port 3002

**Script tag**: `<script src="${PIXEL_URL}/track.js" data-pixel-id="pix_..." data-api-url="..."></script>`

**Session**: Cookie `_pxl_sid_${pixelId}`, UUID, 30-day expiry, SameSite=Lax.

**Payload** (POST `/api/pixel/track`):
```json
{ "pixel_id", "session_id", "event_type", "page_url", "referrer", "timestamp", "utm_source?", "utm_medium?", "utm_campaign?", "utm_term?", "utm_content?" }
```

**Validation**: Zod — `pixel_id` matches `/^pix_[a-f0-9]{32}$/`, `session_id` UUID, `event_type` enum, `page_url` valid URL.

**Global function**: `window.__pixelTrack(eventType?: string)` for custom events.

---

## 10. Background Jobs

| Job | Cron | Timezone | What it does |
|-----|------|----------|-------------|
| `daily-attribution` | `0 0 * * *` (midnight) | Asia/Manila | Finds unattributed payment events (Stripe/PayPal), runs cross-reference attribution |
| `gemini-recommendations` | `0 2 * * *` (2 AM) | Asia/Manila | For each user with pixel_id, generates AI-enhanced recommendations (last 30 days) |

**Job status tracking**: `{ name, lastRun, lastStatus, lastError, nextRun, runCount, failCount }`

Manual trigger: `triggerJob(name)`. Status: `getJobStatus(name)`, `getAllJobStatuses()`.

---

## 11. Conventions

- API envelope: `{ success, data }` — frontend `fetchApi<T>()` unwraps to `T`
- Currency: Philippine Peso (`₱`)
- Channel names: lowercase in backend, capitalized in frontend display
- Performance ratings: `exceptional | excellent | satisfactory | poor | failing` (lowercase)
- Synergy thresholds: >= 1.5 strong, >= 1.0 medium, < 1.0 weak
- Imports: `@shared/types` for shared types in both frontend and backend
- Auth: dev mode bypasses login via `DEFAULT_USER_ID` env var
- DB access: direct Supabase client (no ORM), service role key bypasses RLS
- Errors: `asyncHandler` wraps all routes, stores catch + toast on frontend
