# Troubleshooting

Common issues and solutions across all platform features.

## Server & Startup

### Backend won't start

**Symptoms:** `npm run dev:backend` fails or exits immediately.

**Possible causes:**

1. **Missing environment variables**: Ensure `.env` exists and has all required values. Copy from `.env.example` if missing:
   ```bash
   cp .env.example .env
   ```

2. **Port already in use**: Backend defaults to port 3001.
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

3. **Supabase connection failed**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct and the Supabase project is running.

### Frontend shows blank page

1. Check the browser console for errors
2. Verify the backend is running on port 3001
3. Ensure `FRONTEND_URL` in `.env` matches the frontend origin (`http://localhost:3000`)

### All three servers don't start together

`npm run dev` starts backend, frontend, and pixel servers concurrently. If one fails, the others may still run. Check each server's output individually:

```bash
npm run dev:backend   # port 3001
npm run dev:frontend  # port 3000
npm run dev:pixel     # port 3002 (if applicable)
```

## Authentication

### "Missing or invalid authorization header"

The backend requires a Supabase JWT in the `Authorization: Bearer <token>` header. In development, if `DEFAULT_USER_ID` is set in `.env`, the auth middleware may bypass token validation. Verify:

1. `DEFAULT_USER_ID` is set to a valid UUID in `.env`
2. The frontend is sending the auth header (check Network tab)

### "Invalid or expired token"

The Supabase JWT has expired. The frontend should refresh the token automatically. If this persists:

1. Clear browser local storage and sign in again
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` match the Supabase project

### OAuth callback returns error

When an OAuth callback fails, you'll be redirected to `/integrations?status=error&message=...`. Common causes:

1. **Invalid state parameter**: The state is a base64url-encoded JSON object containing `userId`, `platform`, `nonce`, and `timestamp`. If it's malformed, the callback will fail.
2. **Expired authorization code**: OAuth codes are single-use and expire quickly. Try connecting again.
3. **Incorrect redirect URI**: The redirect URI in your platform developer console must exactly match `OAUTH_REDIRECT_URI` in `.env`.

For detailed OAuth debugging, see the [OAuth Integration Guide](../../documentation/OAuth-Integration-Guide.md).

## Platform Connections

### Platform shows "error" status

1. The OAuth tokens may have been revoked on the platform side. Disconnect and reconnect.
2. The platform's API may be temporarily unavailable. Wait and try syncing again.

### Platform stays in "syncing" forever

1. Check backend logs for errors during the sync process
2. The background sync may have failed silently. Try disconnecting and reconnecting the platform.
3. Manually trigger a re-sync:
   ```bash
   curl -X POST http://localhost:3001/api/sync/google_analytics_4 \
     -H "Authorization: Bearer <token>"
   ```

### "Unsupported platform: ..."

The platform must be one of: `google_analytics_4`, `meta`, `stripe`, `paypal`. Check for typos in the platform name.

### Stripe connection fails with "Invalid API Key"

1. Verify you're using the **Secret key** (starts with `sk_`), not the Publishable key (starts with `pk_`)
2. For testing, use a test mode key (`sk_test_...`)
3. Ensure the key hasn't been revoked in the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### Google OAuth "Access denied" or scope errors

1. Ensure the required Google APIs are enabled in your Cloud Console project:
   - Google Analytics Data API
   - Google Analytics Admin API
2. Verify the OAuth consent screen is configured
3. In development, you may need to add test users to the OAuth consent screen

### Meta OAuth "App not set up"

1. In the [Meta Developer Dashboard](https://developers.facebook.com/apps), ensure:
   - The **Facebook Login** product is added to your app
   - **Valid OAuth Redirect URIs** includes your callback URL
2. In development mode, only users with app roles can connect
3. For production, submit the app for Meta App Review

## Pixel Tracking

### "Pixel ID not found" in browser console

The `data-pixel-id` attribute is missing from the script tag. Ensure the snippet looks like:

```html
<script src="https://your-pixel-server/track.js" data-pixel-id="pix_abc123..."></script>
```

### Pixel events not appearing in the database

1. **Check the Network tab**: Verify the POST to `/api/pixel/track` returns `200`
2. **Check for CORS errors**: The pixel endpoint allows all origins, but your Content Security Policy may block it
3. **Validation errors**: The pixel ID must match the pattern `pix_` followed by exactly 32 hex characters. The session ID must be a valid UUID.
4. **Rate limiting**: The endpoint limits to 100 requests/minute per IP. Check for `429` responses.

### Pixel script not loading (404)

1. Verify the pixel server is running on port 3002
2. The pixel script is served from the `/dist` directory — ensure it's been built:
   ```bash
   cd packages/pixel && npm run build
   ```

### `__pixelTrack` is not a function

The pixel script hasn't loaded yet when you're trying to call it. Ensure:
1. The script tag appears before your custom event code
2. Use a load event listener:
   ```javascript
   window.addEventListener('load', function() {
     window.__pixelTrack('conversion');
   });
   ```

## Analytics & Dashboard

### Dashboard shows no data

1. **No platforms connected**: Connect at least one platform on the Integrations page
2. **Data hasn't synced yet**: After connecting, wait for the initial sync to complete
3. **Date range mismatch**: The API defaults to the last 30 days. Ensure you have data in that range.
4. **Backend unreachable**: Check the Network tab for failed API calls to `/api/analytics/*`

### Synergy scores all show 0 or empty

Synergy analysis requires multi-touch conversion data — users who interacted with multiple channels before converting. If all conversions come from a single channel, there are no synergies to detect.

### AI recommendations show "base" instead of "enhanced"

1. Verify `GEMINI_API_KEY` is set in `.env`
2. The Gemini service has a 5-minute cache — wait and refresh
3. If Gemini is unavailable, the platform falls back to base (non-AI) recommendations
4. Check backend logs for Gemini API errors

### System Map shows disconnected nodes

Nodes without edges represent channels that don't have detected synergies with other channels. This may be normal if those channels operate independently.

## Attribution

### Attribution status shows 0 conversions

1. **No payment data**: Ensure Stripe or PayPal is connected and synced
2. **No pixel data**: Install the pixel on your website and generate some page views
3. **Attribution hasn't run**: The daily job runs at midnight (Asia/Manila). Manually trigger it:
   ```bash
   curl -X POST http://localhost:3001/api/attribution/run \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"dateRange": {"start": "2026-01-01T00:00:00Z", "end": "2026-02-08T23:59:59Z"}}'
   ```

### Low confidence scores

Confidence scoring depends on:

- **Dual verified** (highest): Both pixel session and GA4 data confirm the channel
- **Single source**: Only one data source available
- **Uncertain** (lowest): Conflicting or insufficient data

To improve scores:
1. Connect both a payment platform (Stripe/PayPal) AND Google Analytics 4
2. Ensure the pixel is installed on all pages (especially landing pages and checkout)
3. Use UTM parameters in all marketing campaigns

### Over-attribution detected

This means a platform is claiming more conversions than actually occurred. The `is_platform_over_attributed` flag is set when the platform's claimed conversions exceed the actual verified count. This is informational — it helps you identify platforms that inflate their metrics.

## Background Jobs

### Jobs not running

The scheduler initializes when the server starts. If jobs aren't running:

1. Verify the server is running continuously (not restarting)
2. Jobs run in the **Asia/Manila** timezone:
   - `daily-attribution`: midnight (00:00)
   - `gemini-recommendations`: 2:00 AM
3. Check backend logs for scheduler initialization messages

### Job shows "failed" status

Check the backend logs for the specific error. Common causes:

- **Attribution job**: Supabase connection issues, or no transactions in the date range
- **Gemini job**: API key invalid, rate limit exceeded, or Gemini service unavailable

## Getting More Help

- **Backend logs**: Check the terminal running `npm run dev:backend` for detailed error output
- **Browser DevTools**: Network tab for API errors, Console tab for JavaScript errors
- **Existing documentation**:
  - [Attribution Engine](../../documentation/ATTRIBUTION_ENGINE.md) — Detailed attribution logic
  - [Gemini AI Integration](../../documentation/GEMINI_AI.md) — AI pipeline details
  - [OAuth Integration Guide](../../documentation/OAuth-Integration-Guide.md) — OAuth flow debugging
  - [Testing Guide](../../documentation/TESTING_GUIDE.md) — Running and writing tests

## Related Documentation

- [User Onboarding Guide](user-onboarding.md) — Getting started walkthrough
- [Pixel Installation Guide](pixel-installation.md) — Pixel setup and verification
- [OAuth Platform Setup](oauth-platform-setup.md) — Platform credential registration
- [System Architecture](../architecture/system-architecture.md) — Technical overview
