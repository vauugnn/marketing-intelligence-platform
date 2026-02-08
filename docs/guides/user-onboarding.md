# User Onboarding Guide

Step-by-step guide to getting started with the Marketing Intelligence Platform.

## Overview

The Marketing Intelligence Platform helps you understand how your marketing channels work together to drive conversions. It connects to your existing platforms (Google Analytics, Meta Ads, Stripe, PayPal), tracks website visitors with a lightweight pixel, and uses AI to generate actionable recommendations.

## Step 1: Sign Up

1. Navigate to the platform URL (default: `http://localhost:3000` in development)
2. Create an account or sign in with your existing credentials
3. You'll land on the **Dashboard** page

## Step 2: Connect Your Marketing Platforms

Navigate to the **Integrations** page (`/integrations`).

### Google Analytics 4

1. Click **Connect** on the Google Analytics 4 card
2. You'll be redirected to Google's authorization page
3. Sign in with the Google account that has access to your GA4 property
4. Grant the requested permissions
5. You'll be redirected back — the card should show **Connected**

### Meta Ads (Facebook/Instagram)

1. Click **Connect** on the Meta card
2. Sign in with your Facebook account
3. Select the ad accounts you want to connect
4. Grant the requested permissions
5. You'll be redirected back with a **Connected** status

### Stripe

Stripe uses an API key instead of OAuth:

1. Click **Connect** on the Stripe card
2. You'll be prompted to enter your Stripe secret API key
3. Find your key at [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
4. Paste your **secret key** (starts with `sk_live_` or `sk_test_`)
5. Click **Connect** — the platform will validate your key

### PayPal

1. Click **Connect** on the PayPal card
2. Sign in with your PayPal Business account
3. Grant the requested permissions
4. You'll be redirected back with a **Connected** status

After connecting each platform, historical data will begin syncing in the background. This may take a few minutes depending on data volume.

## Step 3: Install the Tracking Pixel

The tracking pixel lets the platform monitor website visitor behavior and link it to conversions.

1. On the **Integrations** page, find the **Pixel** section
2. Click **Generate Pixel**
3. Copy the generated HTML snippet:
   ```html
   <script src="https://your-pixel-url/track.js" data-pixel-id="pix_your_pixel_id"></script>
   ```
4. Paste this snippet into the `<head>` section of every page on your website
5. The pixel will automatically track page views and capture UTM parameters

For detailed installation instructions (including custom events, verification, and GDPR), see the [Pixel Installation Guide](pixel-installation.md).

## Step 4: Explore the Dashboard

### Dashboard (`/`)

The main dashboard shows:

- **Channel Performance Table**: Revenue, spend, ROI, conversions, and performance rating for each connected channel
- **System Map Widget**: A preview of how your channels interact

### System Map (`/system-map`)

The full-screen network graph visualization shows:

- **Nodes**: Each marketing channel, sized by performance
- **Edges**: Connections between channels that work together (synergies)
- **Synergy scores**: How much each channel pair amplifies each other's performance

### Recommendations (`/recommendations`)

AI-powered marketing recommendations grouped by priority:

- **High priority**: Actions that should be taken immediately
- **Medium priority**: Optimizations worth considering
- **Low priority**: Minor improvements for fine-tuning

Each recommendation includes:
- **Action**: What to do
- **Reason**: Why the platform suggests it
- **Estimated impact**: The projected benefit
- **AI explanation**: Deeper context from Gemini AI (when available)

## Step 5: Understand Attribution

Once you have platforms connected and the pixel installed, the platform begins attributing conversions:

1. **Daily at midnight**, the attribution engine runs automatically
2. It matches Stripe/PayPal transactions against pixel sessions
3. Cross-validates with GA4 data for higher confidence
4. Each conversion gets a **confidence score** (0-100) and **level** (high/medium/low)

You can view attribution results on the Dashboard through channel performance data, which reflects verified conversions.

## Common Terms

| Term | Meaning |
|------|---------|
| **Synergy** | When two channels together produce more conversions than they would separately |
| **Attribution** | Determining which marketing channel deserves credit for a conversion |
| **Dual verified** | A conversion confirmed by both pixel tracking and GA4 data |
| **Over-attribution** | When a platform claims more conversions than actually occurred |
| **Channel role** | Whether a channel primarily introduces, supports, or closes conversions |
| **ROI** | Return on investment: revenue divided by spend |

## Related Documentation

- [Pixel Installation Guide](pixel-installation.md) — Detailed pixel setup
- [OAuth Platform Setup](oauth-platform-setup.md) — Platform credential registration
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
- [System Architecture](../architecture/system-architecture.md) — Technical overview
