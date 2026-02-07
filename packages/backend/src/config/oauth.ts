import { Platform } from '@shared/types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/api/oauth/callback';

export function getOAuthConfig(platform: Platform): OAuthConfig | null {
  switch (platform) {
    case 'google_analytics_4':
      return {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        redirectUri: OAUTH_REDIRECT_URI,
      };

    case 'meta':
      return {
        clientId: process.env.META_OAUTH_APP_ID || '',
        clientSecret: process.env.META_OAUTH_APP_SECRET || '',
        authorizationUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        scopes: ['ads_read', 'read_insights'],
        redirectUri: OAUTH_REDIRECT_URI,
      };

    case 'paypal': {
      const isProduction = process.env.NODE_ENV === 'production';
      return {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        authorizationUrl: isProduction
          ? 'https://www.paypal.com/signin/authorize'
          : 'https://www.sandbox.paypal.com/signin/authorize',
        tokenUrl: isProduction
          ? 'https://api-m.paypal.com/v1/oauth2/token'
          : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        scopes: ['https://uri.paypal.com/services/reporting/search/read'],
        redirectUri: OAUTH_REDIRECT_URI,
      };
    }

    case 'mailchimp':
      return {
        clientId: process.env.MAILCHIMP_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.MAILCHIMP_OAUTH_CLIENT_SECRET || '',
        authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
        tokenUrl: 'https://login.mailchimp.com/oauth2/token',
        scopes: [],
        redirectUri: OAUTH_REDIRECT_URI,
      };

    case 'hubspot':
      return {
        clientId: process.env.HUBSPOT_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.HUBSPOT_OAUTH_CLIENT_SECRET || '',
        authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
        tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
        scopes: ['content', 'e-commerce'],
        redirectUri: OAUTH_REDIRECT_URI,
      };

    // Stripe uses API key, not OAuth redirect flow
    case 'stripe':
      return null;

    default:
      return null;
  }
}

export { OAUTH_REDIRECT_URI };
