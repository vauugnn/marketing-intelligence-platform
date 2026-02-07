import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform, PlatformConnection, ConnectionStatus } from '@shared/types';
import { encrypt, decrypt } from '../../utils/encryption';

export class OAuthRepository {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save or update platform connection with encrypted tokens
   */
  async saveConnection(connection: PlatformConnection): Promise<PlatformConnection> {
    // Encrypt tokens before storage
    const encryptedConnection = {
      ...connection,
      access_token: connection.access_token ? encrypt(connection.access_token) : null,
      refresh_token: connection.refresh_token ? encrypt(connection.refresh_token) : null
    };

    const { data, error } = await this.supabase
      .from('platform_connections')
      .upsert(encryptedConnection, {
        onConflict: 'user_id,platform'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save connection: ${error.message}`);
    }

    // Return with decrypted tokens
    return this.decryptConnection(data);
  }

  /**
   * Get platform connection for a user
   */
  async getConnection(userId: string, platform: Platform): Promise<PlatformConnection | null> {
    const { data, error } = await this.supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get connection: ${error.message}`);
    }

    return this.decryptConnection(data);
  }

  /**
   * Get all connections for a user
   */
  async getAllConnections(userId: string): Promise<PlatformConnection[]> {
    const { data, error } = await this.supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get connections: ${error.message}`);
    }

    return data.map(conn => this.decryptConnection(conn));
  }

  /**
   * Update connection status
   */
  async updateStatus(
    userId: string,
    platform: Platform,
    status: ConnectionStatus
  ): Promise<void> {
    const { error } = await this.supabase
      .from('platform_connections')
      .update({ status })
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(userId: string, platform: Platform): Promise<void> {
    const { error } = await this.supabase
      .from('platform_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      throw new Error(`Failed to update last sync: ${error.message}`);
    }
  }

  /**
   * Delete a platform connection
   */
  async deleteConnection(userId: string, platform: Platform): Promise<void> {
    const { error } = await this.supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`);
    }
  }

  /**
   * Decrypt tokens in a connection
   */
  private decryptConnection(encryptedConnection: any): PlatformConnection {
    return {
      ...encryptedConnection,
      access_token: encryptedConnection.access_token
        ? decrypt(encryptedConnection.access_token)
        : undefined,
      refresh_token: encryptedConnection.refresh_token
        ? decrypt(encryptedConnection.refresh_token)
        : undefined
    };
  }
}
