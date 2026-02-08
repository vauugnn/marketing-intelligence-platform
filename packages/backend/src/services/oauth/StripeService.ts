import Stripe from 'stripe';
import { BaseOAuthService } from './BaseOAuthService';
import { Platform, PlatformConnection } from '@shared/types';

/**
 * Stripe Connect OAuth Integration
 */
export class StripeService extends BaseOAuthService {
  readonly platform: Platform = 'stripe';

  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  });

  private readonly AUTH_ENDPOINT = 'https://connect.stripe.com/oauth/authorize';
  private readonly SCOPE = 'read_only';

  /**
   * Generate Stripe Connect OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    const state = this.encodeState(userId);

    const params = new URLSearchParams({
      client_id: process.env.STRIPE_OAUTH_CLIENT_ID!,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      response_type: 'code',
      scope: this.SCOPE,
      state
    });

    return `${this.AUTH_ENDPOINT}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<PlatformConnection> {
    // Validate and decode state
    const { userId } = this.decodeState(state);

    // Exchange authorization code for access token
    const response = await this.stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });

    // Create connection object
    const connection = this.createConnection(userId, {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      platform_account_id: response.stripe_user_id,
      metadata: {
        scope: response.scope,
        stripe_publishable_key: response.stripe_publishable_key,
        livemode: response.livemode
      }
    });

    // Save to database
    await this.repository.saveConnection(connection);

    return connection;
  }

  /**
   * Refresh Stripe access token
   */
  async refreshToken(connection: PlatformConnection): Promise<PlatformConnection> {
    if (!connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await this.stripe.oauth.token({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token
    });

    // Update connection
    const updated = {
      ...connection,
      access_token: response.access_token
    };

    await this.repository.saveConnection(updated);
    return updated;
  }

  /**
   * Revoke Stripe OAuth access
   */
  protected async revokeAccess(connection: PlatformConnection): Promise<void> {
    if (connection.platform_account_id) {
      try {
        await this.stripe.oauth.deauthorize({
          client_id: process.env.STRIPE_OAUTH_CLIENT_ID!,
          stripe_user_id: connection.platform_account_id
        });
      } catch (error) {
        console.error('Failed to revoke Stripe access:', error);
      }
    }
  }
}
