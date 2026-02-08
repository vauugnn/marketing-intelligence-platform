# Intelligence Platform

Marketing intelligence platform — monorepo with 4 packages under `packages/`.

## Quick Reference

```bash
npm install              # all deps (workspaces)
npm run dev              # backend (3001) + frontend (3000) + pixel (3002)
npm run dev:backend      # backend only
npm run dev:frontend     # frontend only
npm run build            # build all packages
npm run test             # jest tests (backend only)
```

## Monorepo Structure

| Package | Purpose | Port |
|---------|---------|------|
| `backend` | Express API server | 3001 |
| `frontend` | React dashboard (Vite) | 3000 |
| `pixel` | Lightweight tracking script (<5KB) | 3002 |
| `shared` | TypeScript types + utility functions | — |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack React Query, Zustand (toasts only), Tailwind CSS, React Router 6
- **Backend**: Express, TypeScript (tsx for dev), Supabase (PostgreSQL), Google Gemini AI, Passport.js OAuth, node-cron, Zod
- **Pixel**: Webpack, ES2015 target, session-based tracking with UTM capture
- **Shared**: Type-only package + utility functions (ROI calc, channel normalization, currency formatting)

## Path Aliases

- Backend: `@shared/*` -> `../shared/src/*`
- Frontend: `@/*` -> `./src/*`, `@shared/*` -> `../shared/src/*` (configured in both tsconfig and vite.config.ts)

## Backend Architecture

### API Routes
```
/api/analytics       — performance, synergies, journeys, channel-roles, recommendations
/api/integrations    — platform CRUD, connect/disconnect
/api/oauth           — OAuth callbacks
/api/sync            — trigger platform data sync
/api/attribution     — cross-reference verification
/api/pixel           — track events, generate pixel IDs
/health              — health check
```

All endpoints return `{ success: boolean, data: T }` envelope.

### Services (key files)
- `synergy.service.ts` — core analytics engine (performance, synergies, journey patterns, channel roles)
- `gemini.service.ts` — AI enhancement of recommendations (5-min cache, graceful fallback)
- `attribution.service.ts` — cross-reference conversion verification
- `connection.service.ts` — platform connection CRUD
- `oauth/` — per-platform OAuth services with factory pattern (`OAuthServiceFactory`)
- `platforms/` — per-platform data fetch services (GA4, Meta, Stripe, PayPal, HubSpot, Mailchimp)

### Scheduled Jobs (node-cron)
- `daily-attribution` — 00:00 daily
- `gemini-recommendations` — 02:00 daily

### Auth
Dev mode: auth middleware bypasses login, assigns `DEFAULT_USER_ID` from env. No JWT validation in dev.

### Database
- Supabase PostgreSQL — direct client calls (no ORM)
- Tables: `users`, `platform_connections`, `raw_events`, `pixel_events`, `verified_conversions`, `ai_recommendations`
- Migrations in `supabase/migrations/`
- Seed data: `supabase/seed_attribution.sql`, `scripts/seed_synergy_data.ts`

## Frontend Architecture

### Pages (4 routes in App.tsx)
- `/` — Dashboard (channel performance table + system map widget)
- `/integrations` — Platform connection management with OAuth
- `/system-map` — Network graph visualization (nodes from performance, edges from synergies)
- `/recommendations` — AI recommendations with priority grouping

### Data Fetching
All server state via TanStack React Query hooks:
- `hooks/useAnalytics.ts` — `usePerformance()`, `useSynergies()`, `useRecommendations()`, `useJourneyPatterns()`, `useChannelRoles()` (5-min stale time)
- `hooks/useIntegrations.ts` — `usePlatforms()` (30s polling), `usePixel()`, `useConnectPlatform()`, `useDisconnectPlatform()` (mutations with cache invalidation)

API layer: `services/api.ts` — typed `fetchApi<T>()` wrapper with error handling.

### State
- Zustand used only for `useToastStore` in `components/ui/Toast.tsx`
- All server state managed by React Query (no Zustand stores for API data)

## Environment

Copy `.env.example` to `.env`. Required vars:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — database
- `GEMINI_API_KEY` — AI recommendations
- `DEFAULT_USER_ID` — dev auth bypass
- `SESSION_SECRET`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` — security
- Platform OAuth credentials (Google, Meta, Stripe, PayPal, HubSpot, Mailchimp)

## Testing

Backend only — Jest with ts-jest. Tests exist for services, controllers, and utilities.
```bash
cd packages/backend && npm test
```

## Conventions

- API responses always wrapped in `{ success, data }` — frontend `fetchApi<T>()` unwraps automatically
- Currency displayed with `₱` (Philippine Peso)
- Channel names normalized to lowercase in backend, capitalized in frontend display
- Performance ratings: `exceptional`, `excellent`, `satisfactory`, `poor`, `failing` (lowercase from API)
- Synergy strength thresholds: >= 1.5 strong, >= 1.0 medium, < 1.0 weak
- Shared types imported as `@shared/types` in both frontend and backend
