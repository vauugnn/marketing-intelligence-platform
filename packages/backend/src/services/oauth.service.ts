import axios from 'axios';
import { Platform } from '@shared/types';
import { getOAuthConfig, OAUTH_REDIRECT_URI } from '../config/oauth';
import { logger } from '../utils/logger';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Generates the OAuth authorization URL for a given platform.
 * The state parameter encodes the platform and userId for the callback.
 */
export function generateAuthUrl(platform: Platform, userId: string): string {
  const config = getOAuthConfig(platform);
  if (!config) {
    throw new Error(`OAuth is not supported for platform: ${platform}`);
  }

  const state = Buffer.from(JSON.stringify({ platform, userId })).toString('base64');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
  });

  // Google-specific: request offline access for refresh token
  if (platform === 'google_analytics_4') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access/refresh tokens.
 * Handles platform-specific token exchange flows.
 */
export async function exchangeCodeForTokens(platform: Platform, code: string): Promise<TokenResponse> {
  const config = getOAuthConfig(platform);
  if (!config) {
    throw new Error(`OAuth is not supported for platform: ${platform}`);
  }

  switch (platform) {
    case 'google_analytics_4':
      return exchangeGoogleToken(config, code);
    case 'meta':
      return exchangeMetaToken(config, code);
    case 'paypal':
      return exchangePayPalToken(config, code);
    case 'mailchimp':
      return exchangeMailchimpToken(config, code);
    case 'hubspot':
      return exchangeHubSpotToken(config, code);
    default:
      throw new Error(`Token exchange not implemented for: ${platform}`);
  }
}

/**
 * Refreshes an expired access token using the refresh token.
 */
export async function refreshAccessToken(platform: Platform, refreshToken: string): Promise<TokenResponse> {
  const config = getOAuthConfig(platform);
  if (!config) {
    throw new Error(`OAuth is not supported for platform: ${platform}`);
  }

  switch (platform) {
    case 'google_analytics_4':
      return refreshGoogleToken(config, refreshToken);
    case 'meta':
      return refreshMetaToken(config, refreshToken);
    case 'paypal':
      return refreshPayPalToken(config, refreshToken);
    case 'mailchimp':
      return refreshMailchimpToken(config, refreshToken);
    case 'hubspot':
      return refreshHubSpotToken(config, refreshToken);
    default:
      throw new Error(`Token refresh not implemented for: ${platform}`);
  }
}

// --- Google Analytics 4 ---

async function exchangeGoogleToken(config: ReturnType<typeof getOAuthConfig> & {}, code: string): Promise<TokenResponse> {
  const { data } = await axios.post(config!.tokenUrl, {
    code,
    client_id: config!.clientId,
    client_secret: config!.clientSecret,
    redirect_uri: config!.redirectUri,
    grant_type: 'authorization_code',
  });

  logger.info('OAuthService', 'Google token exchange successful');

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function refreshGoogleToken(config: ReturnType<typeof getOAuthConfig> & {}, refreshToken: string): Promise<TokenResponse> {
  const { data } = await axios.post(config!.tokenUrl, {
    refresh_token: refreshToken,
    client_id: config!.clientId,
    client_secret: config!.clientSecret,
    grant_type: 'refresh_token',
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

// --- Meta ---

async function exchangeMetaToken(config: ReturnType<typeof getOAuthConfig> & {}, code: string): Promise<TokenResponse> {
  // Step 1: Exchange code for short-lived token
  const { data: shortLived } = await axios.get(config!.tokenUrl, {
    params: {
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      redirect_uri: config!.redirectUri,
      code,
    },
  });

  logger.info('OAuthService', 'Meta short-lived token obtained');

  // Step 2: Exchange short-lived token for long-lived token (60 days)
  const { data: longLived } = await axios.get(config!.tokenUrl, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      fb_exchange_token: shortLived.access_token,
    },
  });

  logger.info('OAuthService', 'Meta long-lived token obtained');

  return {
    accessToken: longLived.access_token,
    expiresIn: longLived.expires_in,
  };
}

async function refreshMetaToken(config: ReturnType<typeof getOAuthConfig> & {}, currentToken: string): Promise<TokenResponse> {
  // Meta long-lived tokens can be refreshed by exchanging before expiry
  const { data } = await axios.get(config!.tokenUrl, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      fb_exchange_token: currentToken,
    },
  });

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

// --- PayPal ---

async function exchangePayPalToken(config: ReturnType<typeof getOAuthConfig> & {}, code: string): Promise<TokenResponse> {
  const auth = Buffer.from(`${config!.clientId}:${config!.clientSecret}`).toString('base64');

  const { data } = await axios.post(
    config!.tokenUrl,
    'grant_type=authorization_code&code=' + encodeURIComponent(code),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  logger.info('OAuthService', 'PayPal token exchange successful');

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function refreshPayPalToken(config: ReturnType<typeof getOAuthConfig> & {}, refreshToken: string): Promise<TokenResponse> {
  const auth = Buffer.from(`${config!.clientId}:${config!.clientSecret}`).toString('base64');

  const { data } = await axios.post(
    config!.tokenUrl,
    'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

// --- Mailchimp ---

async function exchangeMailchimpToken(config: ReturnType<typeof getOAuthConfig> & {}, code: string): Promise<TokenResponse> {
  const { data } = await axios.post(
    config!.tokenUrl,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      redirect_uri: config!.redirectUri,
      code,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  logger.info('OAuthService', 'Mailchimp token exchange successful');

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function refreshMailchimpToken(config: ReturnType<typeof getOAuthConfig> & {}, currentToken: string): Promise<TokenResponse> {
  // Mailchimp tokens don't expire, so we just return the current token
  // If needed, user would need to re-authenticate
  return {
    accessToken: currentToken,
  };
}

// --- HubSpot ---

async function exchangeHubSpotToken(config: ReturnType<typeof getOAuthConfig> & {}, code: string): Promise<TokenResponse> {
  const { data } = await axios.post(
    config!.tokenUrl,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      redirect_uri: config!.redirectUri,
      code,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  logger.info('OAuthService', 'HubSpot token exchange successful');

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function refreshHubSpotToken(config: ReturnType<typeof getOAuthConfig> & {}, refreshToken: string): Promise<TokenResponse> {
  const { data } = await axios.post(
    config!.tokenUrl,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config!.clientId,
      client_secret: config!.clientSecret,
      refresh_token: refreshToken,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

