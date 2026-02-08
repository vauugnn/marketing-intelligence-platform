# System Architecture

Technical architecture of the Marketing Intelligence Platform — a monorepo with four packages that work together to collect, attribute, and analyze marketing performance data.

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[React Dashboard<br/>:3000]
        CustomerSite[Customer Website<br/>Pixel Script]
    end

    subgraph "API Layer"
        Backend[Express API Server<br/>:3001]
        PixelServer[Pixel CDN Server<br/>:3002]
    end

    subgraph "External Platforms"
        GA4[Google Analytics 4]
        Meta[Meta Ads]
        Stripe[Stripe]
        PayPal[PayPal]
    end

    subgraph "Data Layer"
        Supabase[(Supabase PostgreSQL)]
        Gemini[Google Gemini AI]
    end

    subgraph "Background Jobs"
        Cron[node-cron Scheduler]
        AttrJob[Daily Attribution<br/>00:00]
        GeminiJob[AI Recommendations<br/>02:00]
    end

    Browser -->|REST API| Backend
    CustomerSite -->|POST /api/pixel/track| Backend
    CustomerSite -->|GET /track.js| PixelServer

    Backend -->|OAuth + Data Fetch| GA4
    Backend -->|OAuth + Data Fetch| Meta
    Backend -->|API Key + Data Fetch| Stripe
    Backend -->|OAuth + Data Fetch| PayPal

    Backend -->|Read/Write| Supabase
    Backend -->|AI Enhancement| Gemini

    Cron --> AttrJob
    Cron --> GeminiJob
    AttrJob -->|Read/Write| Supabase
    GeminiJob -->|Read/Write| Supabase
    GeminiJob -->|Generate| Gemini
```

## Request Flow

How an authenticated API request is processed from the React frontend to the backend.

```mermaid
sequenceDiagram
    participant Client as React Dashboard
    participant API as Express Server
    participant Auth as Auth Middleware
    participant Supabase as Supabase Auth
    participant Controller as Controller
    participant Service as Service Layer
    participant DB as Supabase DB

    Client->>API: GET /api/analytics/performance<br/>Authorization: Bearer <token>
    API->>Auth: authMiddleware()
    Auth->>Supabase: supabase.auth.getUser(token)
    Supabase-->>Auth: { user: { id, email } }
    Auth->>Auth: req.userId = user.id
    Auth->>Controller: next()
    Controller->>Service: getChannelPerformance(userId, dateRange)
    Service->>DB: SELECT from raw_events, verified_conversions
    DB-->>Service: rows
    Service-->>Controller: ChannelPerformance[]
    Controller-->>Client: { success: true, data: [...] }
```

## OAuth Connection Flow

How a user connects a marketing platform (e.g., Google Analytics 4) via OAuth.

```mermaid
sequenceDiagram
    participant User as User Browser
    participant Frontend as React Frontend
    participant Backend as Express Backend
    participant Platform as Platform (GA4/Meta/PayPal)
    participant DB as Supabase DB

    User->>Frontend: Click "Connect Google Analytics"
    Frontend->>Backend: POST /api/integrations/google_analytics_4/connect
    Backend->>Backend: OAuthServiceFactory.getOAuthService('google_analytics_4')
    Backend->>Backend: service.getAuthUrl(userId)<br/>state = base64url({ userId, platform, nonce, timestamp })
    Backend-->>Frontend: { success: true, data: { type: 'oauth', authUrl } }
    Frontend->>User: window.location.href = authUrl

    User->>Platform: Authorize app, grant permissions
    Platform->>Backend: GET /api/oauth/callback?code=xxx&state=yyy

    Backend->>Backend: Decode state (extract platform, userId)
    Backend->>Platform: Exchange code for tokens
    Platform-->>Backend: { access_token, refresh_token }
    Backend->>DB: Upsert platform_connections (encrypted tokens)
    Backend->>Backend: syncService.syncHistoricalData() (background)
    Backend->>User: Redirect to /integrations?status=connected&platform=google_analytics_4
```

## Pixel Tracking & Attribution Flow

How the tracking pixel captures user activity and how conversions are attributed.

```mermaid
sequenceDiagram
    participant Visitor as Website Visitor
    participant Pixel as Pixel Script (track.js)
    participant PixelCDN as Pixel Server (:3002)
    participant Backend as Express Backend (:3001)
    participant DB as Supabase DB
    participant AttrJob as Attribution Job

    Note over Visitor,PixelCDN: Step 1: Pixel Loading
    Visitor->>PixelCDN: GET /track.js
    PixelCDN-->>Visitor: JavaScript tracking script (<5KB)

    Note over Visitor,DB: Step 2: Event Tracking
    Pixel->>Pixel: getSessionId() — read/set cookie _pxl_sid_{pixelId}
    Pixel->>Pixel: getUTMParams() — extract utm_source, utm_medium, etc.
    Pixel->>Backend: POST /api/pixel/track { pixel_id, session_id, event_type, page_url, utm_* }
    Backend->>Backend: Validate with Zod PixelEventSchema
    Backend->>DB: INSERT into pixel_events
    Backend-->>Pixel: { success: true, event_id: "..." }

    Note over Visitor,Pixel: Step 3: Custom Events
    Visitor->>Visitor: Completes purchase
    Pixel->>Pixel: window.__pixelTrack('conversion')
    Pixel->>Backend: POST /api/pixel/track { event_type: 'conversion', ... }
    Backend->>DB: INSERT into pixel_events

    Note over AttrJob,DB: Step 4: Attribution (Daily Cron @ 00:00)
    AttrJob->>DB: Fetch unattributed raw_events (stripe_charge, paypal_transaction)
    AttrJob->>DB: Match pixel_events by email, IP, time proximity
    AttrJob->>DB: Cross-validate with GA4 session data
    AttrJob->>AttrJob: Calculate confidence score (0-100)
    AttrJob->>DB: INSERT into verified_conversions
```

## Database Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        text email
        text pixel_id
        timestamp created_at
        timestamp updated_at
    }

    platform_connections {
        uuid id PK
        uuid user_id FK
        text platform
        text status
        text access_token
        text refresh_token
        timestamp token_expires_at
        text platform_account_id
        jsonb metadata
        timestamp connected_at
        timestamp last_synced_at
        float sync_progress
    }

    raw_events {
        uuid id PK
        uuid user_id FK
        text platform
        text event_type
        jsonb event_data
        timestamp timestamp
        timestamp created_at
    }

    pixel_events {
        uuid id PK
        text pixel_id
        uuid session_id
        uuid user_id FK
        text event_type
        text page_url
        text referrer
        text utm_source
        text utm_medium
        text utm_campaign
        text utm_term
        text utm_content
        timestamp timestamp
        text user_agent
        text ip_address
        jsonb metadata
        timestamp created_at
    }

    verified_conversions {
        uuid id PK
        uuid user_id FK
        text transaction_id
        text email
        numeric amount
        text currency
        uuid pixel_session_id
        text ga4_session_id
        text attributed_channel
        integer confidence_score
        text confidence_level
        text attribution_method
        boolean is_platform_over_attributed
        text[] conflicting_sources
        timestamp timestamp
        timestamp created_at
        jsonb metadata
    }

    ai_recommendations {
        uuid id PK
        uuid user_id FK
        text type
        text channel
        text action
        text reason
        numeric estimated_impact
        numeric confidence
        text priority
        text ai_explanation
        timestamp created_at
    }

    users ||--o{ platform_connections : "has"
    users ||--o{ raw_events : "owns"
    users ||--o{ pixel_events : "tracks"
    users ||--o{ verified_conversions : "has"
    users ||--o{ ai_recommendations : "receives"
    pixel_events }o--|| verified_conversions : "attributed via"
```

## Background Job Architecture

```mermaid
graph TB
    subgraph "Scheduler (node-cron)"
        Scheduler[initializeScheduler<br/>Called on server start]
    end

    subgraph "daily-attribution — 0 0 * * * (midnight)"
        AttrJob[runDailyAttributionJob]
        FetchTxn[Fetch unattributed<br/>raw_events]
        MatchPixel[Match pixel_events<br/>by email, IP, time]
        ValidateGA4[Cross-validate<br/>with GA4 data]
        Score[Calculate<br/>confidence score]
        Store[Store verified_conversions]

        AttrJob --> FetchTxn --> MatchPixel --> ValidateGA4 --> Score --> Store
    end

    subgraph "gemini-recommendations — 0 2 * * * (2:00 AM)"
        GeminiJob[runGeminiRecommendationJob]
        Analyze[Analyze channel<br/>performance data]
        Generate[Generate base<br/>recommendations]
        Enhance[Enhance with<br/>Gemini AI]
        StoreRecs[Store<br/>ai_recommendations]

        GeminiJob --> Analyze --> Generate --> Enhance --> StoreRecs
    end

    subgraph "Job Status Tracking"
        Status[JobStatus]
        Status -->|name| StatusName[string]
        Status -->|lastStatus| StatusVal[success / failed / running / never_run]
        Status -->|runCount| Count[number]
        Status -->|failCount| FailCount[number]
    end

    Scheduler --> AttrJob
    Scheduler --> GeminiJob
    AttrJob -.->|updates| Status
    GeminiJob -.->|updates| Status
```

All jobs run in the **Asia/Manila** timezone. Jobs can be manually triggered via the scheduler's `triggerJob(name)` function.

## Related Documentation

- [API Specification (OpenAPI)](../api/openapi.yaml) — Full endpoint reference
- [Attribution Engine](../../documentation/ATTRIBUTION_ENGINE.md) — Detailed attribution logic
- [Gemini AI Integration](../../documentation/GEMINI_AI.md) — AI recommendation pipeline
- [OAuth Integration Guide](../../documentation/OAuth-Integration-Guide.md) — OAuth flow implementation details
