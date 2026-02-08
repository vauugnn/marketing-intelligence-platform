# OAuth Platform Setup

How to register developer credentials for each marketing platform. These credentials are needed for the platform's OAuth flows — they are **not** end-user credentials.

For the OAuth flow architecture and implementation details, see the [OAuth Integration Guide](../../documentation/OAuth-Integration-Guide.md).

## Overview

The platform uses OAuth 2.0 to let users connect their marketing accounts. Before users can connect, you need to register the application with each platform's developer portal and obtain client credentials.

### Callback URL

All OAuth platforms redirect to a single callback endpoint:

```
http://localhost:3001/api/oauth/callback   (development)
https://your-domain.com/api/oauth/callback (production)
```

Set this as the redirect/callback URI in each platform's developer console.

## Google Analytics 4

### Registration

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add the callback URL to **Authorized redirect URIs**
7. Copy the **Client ID** and **Client Secret**

### Required APIs

Enable these APIs in your Google Cloud project:

- Google Analytics Data API (`analyticsdata.googleapis.com`)
- Google Analytics Admin API (`analyticsadmin.googleapis.com`)

### Environment Variables

```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-your_client_secret
```

### Scopes Requested

- `https://www.googleapis.com/auth/analytics.readonly`

## Meta (Facebook/Instagram Ads)

### Registration

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **Create App** > Select **Business** type
3. Add the **Facebook Login** product
4. Under **Facebook Login > Settings**:
   - Add the callback URL to **Valid OAuth Redirect URIs**
5. Navigate to **Settings > Basic** to find your **App ID** and **App Secret**

### Required Permissions

Configure these permissions under **App Review > Permissions and Features**:

- `ads_read` — Read ad campaigns and metrics
- `ads_management` — (optional) For campaign management features
- `read_insights` — Read ad account insights

### Environment Variables

```env
META_OAUTH_APP_ID=your_meta_app_id
META_OAUTH_APP_SECRET=your_meta_app_secret
```

### App Review

For production use, submit your app for Meta's App Review process. In development mode, only users with roles on the app can connect.

## Stripe

Stripe uses API keys instead of OAuth for this platform.

### Getting Your API Key

1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_live_` for production or `sk_test_` for testing)

### How Connection Works

Unlike other platforms, Stripe doesn't use an OAuth redirect flow. Instead:

1. User clicks **Connect** on the Stripe card
2. The platform prompts for an API key
3. The key is validated by making a test `balance.retrieve()` call
4. On success, the key is encrypted and stored

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### Security Note

Stripe API keys grant full access to the connected account. The platform encrypts stored keys using `TOKEN_ENCRYPTION_KEY` from the environment. Keep this encryption key secure and rotate it if compromised.

## PayPal

### Registration

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
2. Click **Create App** under **REST API apps**
3. Select **Merchant** as the app type
4. Copy the **Client ID** and **Secret** from the app details page

### Sandbox vs. Live

- Use **Sandbox** credentials for development and testing
- Switch to **Live** credentials for production
- The sandbox and live apps have separate client IDs and secrets

### Environment Variables

```env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

### Required Scopes

- `https://uri.paypal.com/services/reporting/search/read` — Transaction search

## HubSpot (Future)

### Registration

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Under **Auth**, add the callback URL to **Redirect URLs**
4. Copy the **Client ID** and **Client Secret**

### Environment Variables

```env
HUBSPOT_OAUTH_CLIENT_ID=your_hubspot_client_id
HUBSPOT_OAUTH_CLIENT_SECRET=your_hubspot_client_secret
```

### Required Scopes

- `crm.objects.contacts.read`
- `crm.objects.deals.read`

## Mailchimp (Future)

### Registration

1. Go to [Mailchimp OAuth2 Registration](https://admin.mailchimp.com/account/oauth2/)
2. Register a new application
3. Add the callback URL to **Redirect URI**
4. Copy the **Client ID** and **Client Secret**

### Environment Variables

```env
MAILCHIMP_OAUTH_CLIENT_ID=your_mailchimp_client_id
MAILCHIMP_OAUTH_CLIENT_SECRET=your_mailchimp_client_secret
```

## Environment Variable Summary

All OAuth credentials go in the `.env` file at the project root:

```env
# Google (GA4)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Meta (Facebook/Instagram)
META_OAUTH_APP_ID=
META_OAUTH_APP_SECRET=

# Stripe
STRIPE_SECRET_KEY=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# HubSpot (future)
HUBSPOT_OAUTH_CLIENT_ID=
HUBSPOT_OAUTH_CLIENT_SECRET=

# Mailchimp (future)
MAILCHIMP_OAUTH_CLIENT_ID=
MAILCHIMP_OAUTH_CLIENT_SECRET=

# Callback URI (shared by all OAuth platforms)
OAUTH_REDIRECT_URI=http://localhost:3001/api/oauth/callback
```

## Related Documentation

- [OAuth Integration Guide](../../documentation/OAuth-Integration-Guide.md) — OAuth flow architecture and implementation
- [Contributing](../CONTRIBUTING.md) — Adding a new platform integration
- [User Onboarding Guide](user-onboarding.md) — End-user platform connection instructions
- [Troubleshooting](troubleshooting.md) — OAuth-specific issues
