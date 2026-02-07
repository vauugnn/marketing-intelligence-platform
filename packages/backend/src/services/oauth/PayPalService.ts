import axios from 'axios';
import { BaseOAuthService } from './BaseOAuthService';
import { Platform, PlatformConnection } from '@shared/types';

const PAYPAL_SANDBOX_URL = 'https://www.sandbox.paypal.com';
const PAYPAL_PRODUCTION_URL = 'https://www.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const PAYPAL_PRODUCTION_API = 'https://api-m.paypal.com';

/**
 * PayPal OAuth Integration
 * Uses PayPal Identity API for authorization and token exchange.
 * Sandbox URLs are used in development; production URLs in production.
 */
export class PayPalService extends BaseOAuthService {
  readonly platform: Platform = 'paypal';

  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private get baseUrl(): string {
    return this.isProduction ? PAYPAL_PRODUCTION_URL : PAYPAL_SANDBOX_URL;
  }

  private get apiBaseUrl(): string {
    return this.isProduction ? PAYPAL_PRODUCTION_API : PAYPAL_SANDBOX_API;
  }

  private get basicAuth(): string {
    const credentials = `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`;
    return Buffer.from(credentials).toString('base64');
  }

  private readonly SCOPES = [
    'https://uri.paypal.com/services/reporting/search/read'
  ];

  /**
   * Generate PayPal OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    const state = this.encodeState(userId);

    const params = new URLSearchParams({
      client_id: process.env.PAYPAL_CLIENT_ID!,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      state
    });

    return `${this.baseUrl}/signin/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback - exchange authorization code for tokens
   */
  async handleCallback(code: string, state: string): Promise<PlatformConnection> {
    const { userId } = this.decodeState(state);

    // Exchange authorization code for access + refresh tokens
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/oauth2/token`,
      `grant_type=authorization_code&code=${encodeURIComponent(code)}`,
      {
        headers: {
          'Authorization': `Basic ${this.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const connection = this.createConnection(userId, {
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      metadata: {
        scope: response.data.scope,
        token_type: response.data.token_type,
      }
    });

    await this.repository.saveConnection(connection);
    return connection;
  }

  /**
   * Refresh expired PayPal access token
   */
  async refreshToken(connection: PlatformConnection): Promise<PlatformConnection> {
    if (!connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${this.apiBaseUrl}/v1/oauth2/token`,
      `grant_type=refresh_token&refresh_token=${encodeURIComponent(connection.refresh_token)}`,
      {
        headers: {
          'Authorization': `Basic ${this.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const updated = {
      ...connection,
      access_token,
      refresh_token: refresh_token || connection.refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    };

    await this.repository.saveConnection(updated);
    return updated;
  }

  /**
   * Revoke PayPal OAuth access
   */
  protected async revokeAccess(connection: PlatformConnection): Promise<void> {
    if (connection.access_token) {
      try {
        await axios.post(
          `${this.apiBaseUrl}/v1/oauth2/token/terminate`,
          `token=${encodeURIComponent(connection.access_token)}&token_type_hint=ACCESS_TOKEN`,
          {
            headers: {
              'Authorization': `Basic ${this.basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (error) {
        console.error('Failed to revoke PayPal token:', error);
      }
    }
  }
}
