import { supabaseAdmin } from '../config/supabase';
import { Platform, ConnectionStatus, PlatformConnection } from '@shared/types';
import { logger } from '../utils/logger';

const TABLE = 'platform_connections';

export async function getConnectionsByUser(userId: string): Promise<PlatformConnection[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    logger.error('ConnectionService', 'Failed to get connections', error);
    throw new Error('Failed to fetch connections');
  }

  return data || [];
}

export async function getConnection(userId: string, platform: Platform): Promise<PlatformConnection | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected when not connected
    logger.error('ConnectionService', 'Failed to get connection', error);
    throw new Error('Failed to fetch connection');
  }

  return data || null;
}

export async function upsertConnection(params: {
  userId: string;
  platform: Platform;
  status: ConnectionStatus;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  platformAccountId?: string;
  metadata?: Record<string, any>;
}): Promise<PlatformConnection> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(
      {
        user_id: params.userId,
        platform: params.platform,
        status: params.status,
        access_token: params.accessToken,
        refresh_token: params.refreshToken || null,
        token_expires_at: params.tokenExpiresAt?.toISOString() || null,
        platform_account_id: params.platformAccountId || null,
        metadata: params.metadata || null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )
    .select()
    .single();

  if (error) {
    logger.error('ConnectionService', 'Failed to upsert connection', error);
    throw new Error('Failed to save connection');
  }

  return data;
}

export async function updateConnectionStatus(
  userId: string,
  platform: Platform,
  status: ConnectionStatus
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ status })
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) {
    logger.error('ConnectionService', 'Failed to update connection status', error);
    throw new Error('Failed to update connection status');
  }
}

export async function updateLastSynced(userId: string, platform: Platform): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) {
    logger.error('ConnectionService', 'Failed to update last synced', error);
    throw new Error('Failed to update last synced');
  }
}

export async function deleteConnection(userId: string, platform: Platform): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) {
    logger.error('ConnectionService', 'Failed to delete connection', error);
    throw new Error('Failed to delete connection');
  }
}

export async function updateTokens(
  userId: string,
  platform: Platform,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  const update: Record<string, any> = { access_token: accessToken };
  if (refreshToken) update.refresh_token = refreshToken;
  if (expiresAt) update.token_expires_at = expiresAt.toISOString();

  const { error } = await supabaseAdmin
    .from(TABLE)
    .update(update)
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) {
    logger.error('ConnectionService', 'Failed to update tokens', error);
    throw new Error('Failed to update tokens');
  }
}
