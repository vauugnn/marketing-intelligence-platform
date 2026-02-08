# Seed Data Strategy

Since third-party OAuth connections (Meta, Google, etc.) require business verification and privacy policies that are not available for this hackathon, the platform will be demoed using **pre-seeded data** for each user.

## Approach

Every demo user gets a unique user ID with pre-populated data that simulates connected platforms and real marketing activity. No live OAuth connections are needed — the dashboard, system map, and recommendations all work from this seeded data.

## Per-User Seed Data

Each user requires data in 5 tables. Below is the structure for each.

### 1. User Record (`users`)

| Field | Value |
|-------|-------|
| `id` | Unique UUID per user |
| `email` | Unique email per user |
| `pixel_id` | Unique pixel ID per user (format: `pix_<32 hex chars>`) |

### 2. Platform Connections (`platform_connections`)

Each user gets 3 simulated connected platforms:

| Platform | Status | Purpose |
|----------|--------|---------|
| `google_analytics_4` | `connected` | Traffic source data, session tracking |
| `meta` | `connected` | Facebook/Instagram ad spend and conversions |
| `stripe` | `connected` | Payment transaction data |

Tokens are set to placeholder values (e.g., `ga4-seed-token`). Since the app reads from seeded `raw_events` and `verified_conversions`, no real API calls are made to these platforms.

### 3. Raw Events (`raw_events`)

Each user needs these event types to power the analytics engine:

| Event Type | Platform | Purpose | Recommended Count |
|------------|----------|---------|-------------------|
| `ga4_traffic_source` | `google_analytics_4` | Channel-level traffic data | 15-20 per user |
| `stripe_charge` | `stripe` | Payment transactions | 30-50 per user |
| `ad_spend` | `meta` | Ad spend by channel | 5-10 per user |
| `ad_spend` | `google_ads` | Ad spend by channel | 5-10 per user |

#### Channel Distribution per User

Each user should have a **unique mix** of channel performance to make the demo interesting. Vary these across users:

**User A — "Google-heavy" profile:**
- Google: high revenue, moderate spend (high ROI)
- Facebook: moderate revenue, moderate spend
- Email: low revenue, no spend (organic)
- Instagram: low revenue, high spend (poor ROI)

**User B — "Social-first" profile:**
- Facebook: high revenue, high spend (good ROI)
- Instagram: moderate revenue, moderate spend
- Google: moderate revenue, low spend
- Email: high revenue, no spend

**User C — "Balanced" profile:**
- Google, Facebook, Email all moderate
- TikTok: low revenue, high spend (triggers "stop" recommendation)

### 4. Pixel Events (`pixel_events`)

Simulated website visitor sessions. Each user needs multi-touch journeys to power synergy analysis:

| Field | Details |
|-------|---------|
| `pixel_id` | Must match the user's `pixel_id` |
| `session_id` | Random UUID per session |
| `event_type` | `page_view` (browsing) and `conversion` (purchase) |
| `utm_source` | Channel name: `google`, `facebook`, `instagram`, `email`, `tiktok` |
| `utm_medium` | `cpc`, `social`, `email`, `organic` |
| `utm_campaign` | Campaign names unique per user |

#### Journey Patterns to Seed

Each user should have a mix of single-touch and multi-touch journeys:

```
facebook → google → [conversion]       (multi-touch, strong synergy)
email → google → [conversion]           (multi-touch, email supporter)
facebook → email → google → [conversion] (3-touch journey)
google → [conversion]                    (single-touch, google as closer)
facebook → [conversion]                  (single-touch)
instagram → [conversion]                 (single-touch, low value)
```

**Recommended: 30-40 journeys per user** with varying amounts to create diverse channel roles (introducer, closer, supporter, isolated).

### 5. Verified Conversions (`verified_conversions`)

Pre-attributed conversions that drive the dashboard display. One per completed journey:

| Field | Details |
|-------|---------|
| `transaction_id` | Must match a `stripe_charge` raw event |
| `attributed_channel` | Last-touch channel from the journey |
| `confidence_score` | 70-95 (vary for realism) |
| `confidence_level` | `high` for multi-touch, `medium` for single-touch |
| `attribution_method` | `dual_verified` for multi-touch, `single_source` for single |
| `amount` | Revenue in PHP (vary by channel and user profile) |
| `currency` | `PHP` |

## User ID Assignments

| User | UUID | Email | Profile |
|------|------|-------|---------|
| Demo User A | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | `demo-a@example.com` | Google-heavy |
| Demo User B | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | `demo-b@example.com` | Social-first |
| Demo User C | `cccccccc-cccc-cccc-cccc-cccccccccccc` | `demo-c@example.com` | Balanced |

Add more rows as needed. Set `DEFAULT_USER_ID` in `.env` to switch between users during the demo.

## What This Enables

With seeded data, these features work without any live platform connections:

| Feature | Works? | Data Source |
|---------|--------|-------------|
| Dashboard (channel performance table) | Yes | `verified_conversions` + `raw_events` (ad_spend) |
| System Map (synergy visualization) | Yes | `pixel_events` (multi-touch journeys) |
| AI Recommendations | Yes | `verified_conversions` + Gemini API (needs `GEMINI_API_KEY`) |
| Integrations page (shows connected status) | Yes | `platform_connections` |
| Attribution status | Yes | `verified_conversions` |
| Journey patterns | Yes | `pixel_events` |
| Channel roles | Yes | `pixel_events` + `verified_conversions` |

## Existing Seed Scripts

Two seed scripts already exist and can be used as a starting point:

| Script | What It Does |
|--------|-------------|
| `scripts/seed_attribution.ts` | Seeds 1 user with 50 transactions, pixel events, GA4/Stripe connections |
| `scripts/seed_synergy_data.ts` | Seeds 40 multi-touch conversion journeys with spend data for synergy analysis |

Both currently seed data for a single user (`11111111-1111-1111-1111-111111111111`). They need to be extended to support multiple users with unique data profiles.

### Running Existing Seeds

```bash
npx tsx scripts/seed_attribution.ts
npx tsx scripts/seed_synergy_data.ts
```

## Implementation TODO

1. Create a new `scripts/seed_demo_users.ts` that:
   - Accepts a list of user profiles (or reads from a config)
   - Creates unique users, connections, raw events, pixel events, and verified conversions for each
   - Uses different channel mixes per user for variety
2. Add a `scripts/seed_config.json` defining user profiles and their channel distributions
3. Update `DEFAULT_USER_ID` in `.env.example` to reference one of the demo users
