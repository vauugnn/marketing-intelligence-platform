# Pixel Installation Guide

How to generate, install, and configure the Marketing Intelligence Platform tracking pixel on your website.

## Overview

The tracking pixel is a lightweight JavaScript snippet (<5KB) that tracks page views, captures UTM parameters, and records custom events on your website. It sends data to the platform backend where it's used for cross-channel attribution.

## Generating Your Pixel

### Via the Dashboard

1. Navigate to the **Integrations** page (`/integrations`)
2. Find the **Pixel** section
3. Click **Generate Pixel**
4. Copy the generated snippet

### Via the API

```bash
curl -X POST http://localhost:3001/api/pixel/generate \
  -H "Content-Type: application/json"
```

Response:

```json
{
  "success": true,
  "data": {
    "pixel_id": "pix_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "snippet": "<script src=\"http://localhost:3002/track.js\" data-pixel-id=\"pix_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\"></script>"
  }
}
```

## Basic Installation

Add the snippet to the `<head>` section of every page you want to track:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Website</title>

  <!-- Marketing Intelligence Pixel -->
  <script
    src="https://your-pixel-server.com/track.js"
    data-pixel-id="pix_your_pixel_id_here"
  ></script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

The pixel automatically:
- Generates a session ID (stored in a cookie for 30 days)
- Captures the current page URL and referrer
- Extracts UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
- Sends a `page_view` event to the backend

### Custom API URL

By default, the pixel derives the backend URL from the script source. To specify a custom backend URL:

```html
<script
  src="https://your-pixel-server.com/track.js"
  data-pixel-id="pix_your_pixel_id_here"
  data-api-url="https://your-backend.com/api/pixel/track"
></script>
```

## Custom Events

### Tracking Conversions

Call `window.__pixelTrack()` when a user completes a conversion:

```javascript
// Track a purchase completion
document.getElementById('buy-button').addEventListener('click', function() {
  window.__pixelTrack('conversion');
});
```

### Tracking Custom Events

```javascript
// Track a signup
window.__pixelTrack('custom');
```

### Event Types

| Type | Purpose |
|------|---------|
| `page_view` | Automatically tracked on every page load |
| `conversion` | Manually triggered when a user converts (purchase, signup, etc.) |
| `custom` | General-purpose custom event |

## Session Management

### How Sessions Work

- A session ID is generated on first visit and stored in a cookie named `_pxl_sid_{pixelId}`
- The cookie expires after **30 days**
- The same session ID is sent with every event, allowing the attribution engine to link multiple page views to a single user journey
- Sessions persist across page navigations within the same site

### Cookie Details

| Property | Value |
|----------|-------|
| Cookie name | `_pxl_sid_{pixelId}` |
| Expiry | 30 days |
| Path | `/` |
| SameSite | `Lax` |
| Secure | Not set (set this in production) |

## Verifying Installation

### 1. Check Browser DevTools

1. Open your website with the pixel installed
2. Open Developer Tools (F12) > **Network** tab
3. Filter for `track.js` — you should see a successful GET request to the pixel server
4. Filter for `track` — you should see a POST request to `/api/pixel/track`
5. The POST response should return `{ "success": true, "event_id": "..." }`

### 2. Check for Errors

Open the **Console** tab in Developer Tools. Look for:

- `Pixel ID not found` — The `data-pixel-id` attribute is missing from the script tag
- `Pixel tracking failed` — The backend is unreachable or returned an error
- CORS errors — The backend may not be allowing requests from your domain

### 3. Validate via API

You can verify pixel events are being stored by checking the attribution status after a few events have been tracked.

## UTM Parameter Tracking

The pixel automatically captures UTM parameters from the page URL. Ensure your marketing campaigns include UTM tags:

```
https://yoursite.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale
```

| Parameter | Purpose |
|-----------|---------|
| `utm_source` | Traffic source (e.g., google, facebook, newsletter) |
| `utm_medium` | Marketing medium (e.g., cpc, email, social) |
| `utm_campaign` | Campaign name |
| `utm_term` | Paid search keyword |
| `utm_content` | Ad variant (for A/B testing) |

## Rate Limiting

The `/api/pixel/track` endpoint is rate-limited to **100 requests per minute per IP address**. This is sufficient for normal website traffic. If you exceed this limit, you'll receive a `429 Too Many Requests` response.

## GDPR & Privacy Compliance

### Cookie Consent

The pixel sets a first-party cookie (`_pxl_sid_{pixelId}`). Depending on your jurisdiction, you may need to:

1. **Inform users** about the cookie in your privacy policy
2. **Obtain consent** before loading the pixel script (for EU/GDPR)
3. **Provide opt-out** mechanism

### Conditional Loading Example

```html
<script>
  // Only load the pixel if the user has consented to analytics cookies
  if (userHasConsentedToAnalytics()) {
    var script = document.createElement('script');
    script.src = 'https://your-pixel-server.com/track.js';
    script.setAttribute('data-pixel-id', 'pix_your_pixel_id');
    document.head.appendChild(script);
  }
</script>
```

### Data Collected

The pixel collects:
- Page URL and referrer
- UTM parameters
- Session ID (random UUID, not personally identifiable)
- Timestamp
- User agent and IP address (captured server-side for attribution, not sent by the pixel script)

The pixel does **not** collect:
- Names, email addresses, or other PII directly
- Keystrokes or form inputs
- Cross-site browsing history

## Platform-Specific Installation

### WordPress

Add the snippet to your theme's `header.php` file, or use a plugin like "Insert Headers and Footers" to inject it into the `<head>` section.

### Shopify

Go to **Online Store > Themes > Edit Code > theme.liquid** and add the snippet inside the `<head>` tag.

### Next.js / React

Add the script to your root layout or `_document.tsx`:

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://your-pixel-server.com/track.js"
          data-pixel-id="pix_your_pixel_id"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

For SPAs (single-page applications), the pixel tracks the initial page load automatically. For subsequent navigations, call `window.__pixelTrack('page_view')` on route changes.

## Related Documentation

- [User Onboarding Guide](user-onboarding.md) — Full getting-started walkthrough
- [API Specification](../api/openapi.yaml) — Pixel endpoint reference
- [System Architecture](../architecture/system-architecture.md) — Pixel tracking flow diagram
- [Troubleshooting](troubleshooting.md) — Pixel-specific issues
