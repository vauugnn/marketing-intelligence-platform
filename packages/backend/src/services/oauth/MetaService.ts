import axios from 'axios';
import { BaseOAuthService } from './BaseOAuthService';
import { Platform, PlatformConnection } from '@shared/types';

/**
 * Meta (Facebook/Instagram) OAuth Integration
 */
export class MetaService extends BaseOAuthService {
  readonly platform: Platform = 'meta';

  private readonly API_VERSION = 'v18.0';
  private readonly AUTH_ENDPOINT = `https://www.facebook.com/${this.API_VERSION}/dialog/oauth`;
  private readonly TOKEN_ENDPOINT = `https://graph.facebook.com/${this.API_VERSION}/oauth/access_token`;
  private readonly GRAPH_API_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  private readonly SCOPES = [
    'ads_read',
    'business_management',
    'instagram_basic',
    'instagram_manage_insights'
  ];

  /**
   * Generate Meta OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    const state = this.encodeState(userId);

    const params = new URLSearchParams({
      client_id: process.env.META_OAUTH_APP_ID!,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      state,
      scope: this.SCOPES.join(',')
    });

    return `${this.AUTH_ENDPOINT}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<PlatformConnection> {
    // Validate and decode state
    const { userId } = this.decodeState(state);

    // Exchange code for short-lived access token
    const tokenResponse = await axios.get(this.TOKEN_ENDPOINT, {
      params: {
        client_id: process.env.META_OAUTH_APP_ID,
        client_secret: process.env.META_OAUTH_APP_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
        code
      }
    });

    const shortLivedToken = tokenResponse.data.access_token;

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenResponse = await axios.get(`${this.GRAPH_API_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_OAUTH_APP_ID,
        client_secret: process.env.META_OAUTH_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const { access_token, expires_in } = longLivedTokenResponse.data;

    // Get user's ad accounts
    const adAccountsResponse = await axios.get(`${this.GRAPH_API_URL}/me/adaccounts`, {
      params: {
        access_token,
        fields: 'id,name,account_id'
      }
    });

    // Create connection object
    const connection = this.createConnection(userId, {
      access_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      metadata: {
        ad_accounts: adAccountsResponse.data.data || []
      }
    });

    // Save to database
    await this.repository.saveConnection(connection);

    return connection;
  }

  /**
   * Refresh Meta access token
   * Meta tokens can be refreshed before expiry
   */
  async refreshToken(connection: PlatformConnection): Promise<PlatformConnection> {
    if (!connection.access_token) {
      throw new Error('No access token to refresh');
    }

    // Exchange current token for a new long-lived token
    const response = await axios.get(`${this.GRAPH_API_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_OAUTH_APP_ID,
        client_secret: process.env.META_OAUTH_APP_SECRET,
        fb_exchange_token: connection.access_token
      }
    });

    const { access_token, expires_in } = response.data;

    // Update connection
    const updated = {
      ...connection,
      access_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString()
    };

    await this.repository.saveConnection(updated);
    return updated;
  }

  /**
   * Revoke Meta OAuth access
   */
  protected async revokeAccess(connection: PlatformConnection): Promise<void> {
    if (connection.access_token) {
      try {
        await axios.delete(`${this.GRAPH_API_URL}/me/permissions`, {
          params: {
            access_token: connection.access_token
          }
        });
      } catch (error) {
        console.error('Failed to revoke Meta token:', error);
      }
    }
  }
}
