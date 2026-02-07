import { google } from 'googleapis';
import { BaseOAuthService } from './BaseOAuthService';
import { Platform, PlatformConnection } from '@shared/types';

/**
 * Google Analytics 4 OAuth Integration
 */
export class GoogleAnalyticsService extends BaseOAuthService {
  readonly platform: Platform = 'google_analytics_4';

  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
  );

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly'
  ];

  /**
   * Generate Google OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    const state = this.encodeState(userId);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      state,
      prompt: 'consent' // Force consent to get refresh token
    });

    return authUrl;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<PlatformConnection> {
    // Validate and decode state
    const { userId } = this.decodeState(state);

    // Exchange authorization code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Create connection object
    const connection = this.createConnection(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : undefined,
      metadata: {
        scope: tokens.scope
      }
    });

    // Save to database
    await this.repository.saveConnection(connection);

    return connection;
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(connection: PlatformConnection): Promise<PlatformConnection> {
    if (!connection.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: connection.refresh_token
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    // Update connection with new tokens
    const updated = {
      ...connection,
      access_token: credentials.access_token!,
      token_expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : connection.token_expires_at
    };

    await this.repository.saveConnection(updated);
    return updated;
  }

  /**
   * Revoke Google OAuth access
   */
  protected async revokeAccess(connection: PlatformConnection): Promise<void> {
    if (connection.access_token) {
      try {
        await this.oauth2Client.revokeToken(connection.access_token);
      } catch (error) {
        console.error('Failed to revoke Google token:', error);
        // Continue anyway - we'll delete from our database
      }
    }
  }
}
