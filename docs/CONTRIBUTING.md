# Contributing

Guide for setting up, developing, and contributing to the Marketing Intelligence Platform.

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9 (uses npm workspaces)
- **Supabase** account (for PostgreSQL database)
- **Google Gemini** API key (for AI recommendations)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/vauugnn/intelligence-platform.git
cd intelligence-platform
npm install  # installs all workspace dependencies
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required values:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (for auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `DEFAULT_USER_ID` | UUID for dev auth bypass |
| `SESSION_SECRET` | Random string for session signing |
| `JWT_SECRET` | Random string for JWT signing |
| `TOKEN_ENCRYPTION_KEY` | 32-byte random string for encrypting stored OAuth tokens |

For platform OAuth credentials, see [OAuth Platform Setup](guides/oauth-platform-setup.md).

### 3. Run the dev servers

```bash
npm run dev          # all 3 services: backend (3001) + frontend (3000) + pixel (3002)
npm run dev:backend  # backend only
npm run dev:frontend # frontend only
```

### 4. Seed sample data (optional)

```bash
cd packages/backend
npx tsx scripts/seed_synergy_data.ts
```

## Project Structure

```
intelligence-platform/
├── packages/
│   ├── backend/       Express API server (port 3001)
│   ├── frontend/      React dashboard with Vite (port 3000)
│   ├── pixel/         Tracking script CDN (port 3002)
│   └── shared/        TypeScript types + utility functions
├── documentation/     Existing detailed guides
├── docs/              Structured documentation (you are here)
└── .env.example       Environment template
```

## Development Conventions

### Code Style

- **TypeScript** everywhere — no plain JavaScript files
- **Path aliases**: `@shared/*` in backend, `@/*` and `@shared/*` in frontend
- **No ORMs** — direct Supabase client calls for database operations
- **Zod** for runtime validation (backend request bodies)

### API Response Format

All API responses use the standard envelope:

```json
{ "success": true, "data": <payload> }
```

**Exceptions** (document these when adding new endpoints):
- Attribution endpoints return payloads directly
- Pixel `/track` returns `{ success, event_id }`

### Frontend Patterns

- **React Query** for all server state — no Zustand stores for API data
- **Zustand** used only for `useToastStore` (UI notifications)
- **Tailwind CSS** for styling — no CSS modules or styled-components
- Currency displayed with `₱` (Philippine Peso)
- Channel names normalized to lowercase from API, capitalized in display

### Performance Ratings & Synergy Thresholds

| Metric | Values |
|--------|--------|
| Performance ratings | `exceptional`, `excellent`, `satisfactory`, `poor`, `failing` |
| Synergy strength | >= 1.5 strong, >= 1.0 medium, < 1.0 weak |

## Branch Naming

Use descriptive English branch names with category prefixes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feat/` | New features | `feat/add-hubspot-integration` |
| `fix/` | Bug fixes | `fix/oauth-token-refresh` |
| `docs/` | Documentation | `docs/api-and-user-guides` |
| `refactor/` | Code refactoring | `refactor/synergy-service` |
| `test/` | Adding tests | `test/attribution-service` |

## Pull Request Process

1. **Create a branch** from `main` with the appropriate prefix
2. **Make your changes** — keep PRs focused on a single concern
3. **Write tests** for new backend logic (Jest + ts-jest)
4. **Run the test suite** before submitting:
   ```bash
   cd packages/backend && npm test
   ```
5. **Open a PR** against `main` with:
   - A clear title under 70 characters
   - A summary of what changed and why
   - A test plan (how to verify the changes work)
6. **Address review feedback** — respond to comments, push fixes

### PR Title Examples

- `Add HubSpot OAuth integration`
- `Fix pixel session cookie expiry`
- `Document API endpoints with OpenAPI spec`

## Testing

Tests exist for the backend only (services, controllers, utilities).

```bash
cd packages/backend
npm test              # run all tests
npm test -- --watch   # watch mode
npm test -- --coverage # with coverage
```

Test files are co-located with source: `*.test.ts` next to `*.ts`.

### Writing Tests

- Use Jest with `ts-jest` for TypeScript support
- Mock Supabase client calls — don't hit real databases in tests
- Test service logic independently from controllers
- Follow the existing patterns in `packages/backend/src/`

## Adding a New Platform Integration

1. Create an OAuth service class in `packages/backend/src/services/oauth/`
2. Register it in `OAuthServiceFactory`
3. Create a platform data fetch service in `packages/backend/src/services/platforms/`
4. Add the platform to the `Platform` type in `packages/shared/src/types/index.ts`
5. Add OAuth credentials to `.env.example`
6. Update the integrations controller `ALL_PLATFORMS` array
7. Add tests for the new service

## Related Documentation

- [System Architecture](architecture/system-architecture.md) — Architecture diagrams
- [API Specification](api/openapi.yaml) — Full endpoint reference
- [OAuth Platform Setup](guides/oauth-platform-setup.md) — Platform credential registration
- [Testing Guide](../documentation/TESTING_GUIDE.md) — Detailed testing strategies
