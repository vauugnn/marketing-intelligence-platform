import { Platform, PlatformConnection } from '@shared/types';
import { OAuthRepository } from './OAuthRepository';
import { retry } from '../../utils/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base class for OAuth integrations
 * All platform-specific services extend this class
 */
export abstract class BaseOAuthService {
  protected repository: OAuthRepository;
  abstract readonly platform: Platform;

  constructor() {
    this.repository = new OAuthRepository();
  }

  /**
   * Generate OAuth authorization URL for the platform
   * @param userId - User ID to encode in state parameter
   * @returns Authorization URL to redirect user to
   */
  abstract getAuthUrl(userId: string): Promise<string>;

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param code - Authorization code from OAuth provider
   * @param state - State parameter (contains userId + platform)
   * @returns Platform connection with tokens
   */
  abstract handleCallback(code: string, state: string): Promise<PlatformConnection>;

  /**
   * Refresh expired access token
   * @param connection - Existing connection with refresh token
   * @returns Updated connection with new access token
   */
  abstract refreshToken(connection: PlatformConnection): Promise<PlatformConnection>;

  /**
   * Disconnect and revoke access for a platform
   * @param userId - User ID
   */
  async disconnect(userId: string): Promise<void> {
    // Revoke tokens with the platform (if supported)
    const connection = await this.repository.getConnection(userId, this.platform);
    if (connection) {
      await this.revokeAccess(connection);
    }

    // Delete from database
    await this.repository.deleteConnection(userId, this.platform);
  }

  /**
   * Optional: Revoke access tokens with the platform
   * Override in platform-specific services if supported
   */
  protected async revokeAccess(connection: PlatformConnection): Promise<void> {
    // Default: no-op
    // Override in platforms that support token revocation
  }

  /**
   * Check if token is expired or about to expire
   */
  protected isTokenExpired(connection: PlatformConnection, bufferMinutes: number = 5): boolean {
    if (!connection.token_expires_at) {
      return false; // No expiry info, assume valid
    }

    const expiryTime = new Date(connection.token_expires_at).getTime();
    const bufferMs = bufferMinutes * 60 * 1000;
    const now = Date.now();

    return expiryTime - now < bufferMs;
  }

  /**
   * Ensure token is valid, refresh if needed
   */
  async ensureValidToken(userId: string): Promise<PlatformConnection> {
    let connection = await this.repository.getConnection(userId, this.platform);

    if (!connection) {
      throw new Error(`No connection found for ${this.platform}`);
    }

    // Refresh if expired
    if (this.isTokenExpired(connection)) {
      console.log(`Token expired for ${this.platform}, refreshing...`);
      connection = await this.refreshToken(connection);
      await this.repository.saveConnection(connection);
    }

    return connection;
  }

  /**
   * Execute API call with automatic retry on rate limit
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    return retry(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000
    });
  }

  /**
   * Encode state parameter (contains userId + platform + nonce)
   * Used to prevent CSRF attacks
   */
  protected encodeState(userId: string): string {
    const state = {
      userId,
      platform: this.platform,
      nonce: uuidv4(),
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(state)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  protected decodeState(encodedState: string): { userId: string; platform: Platform } {
    try {
      const decoded = Buffer.from(encodedState, 'base64url').toString('utf8');
      const state = JSON.parse(decoded);

      // Validate timestamp (max 10 minutes old)
      const maxAge = 10 * 60 * 1000;
      if (Date.now() - state.timestamp > maxAge) {
        throw new Error('State parameter expired');
      }

      // Validate platform matches
      if (state.platform !== this.platform) {
        throw new Error('Platform mismatch in state');
      }

      return {
        userId: state.userId,
        platform: state.platform
      };
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Create initial connection object
   */
  protected createConnection(userId: string, partial: Partial<PlatformConnection>): PlatformConnection {
    return {
      id: uuidv4(),
      user_id: userId,
      platform: this.platform,
      status: 'connected',
      connected_at: new Date().toISOString(),
      ...partial
    };
  }
}
