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

    case 'paypal':
      return {
        clientId: process.env.PAYPAL_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_OAUTH_CLIENT_SECRET || '',
        authorizationUrl: 'https://www.sandbox.paypal.com/signin/authorize',
        tokenUrl: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        scopes: ['https://uri.paypal.com/services/reporting/search/read'],
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
