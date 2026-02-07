import { Request, Response } from 'express';
import { Platform } from '@shared/types';
import * as connectionService from '../services/connection.service';
import * as syncService from '../services/sync.service';
import { logger } from '../utils/logger';

/**
 * Returns the sync status for all of the user's platform connections.
 */
export async function getSyncStatus(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const connections = await connectionService.getConnectionsByUser(userId);

  const statuses = connections.map(conn => ({
    platform: conn.platform,
    status: conn.status,
    lastSyncedAt: conn.last_synced_at,
    connectedAt: conn.connected_at,
  }));

  res.json({ success: true, data: statuses });
}

/**
 * Manually triggers a data re-sync for a specific platform.
 */
export async function triggerSync(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const platform = req.params.platform as Platform;

  // Verify the connection exists and is connected
  const connection = await connectionService.getConnection(userId, platform);
  if (!connection || connection.status === 'disconnected') {
    res.status(400).json({
      success: false,
      error: `No active connection for ${platform}. Please connect first.`,
    });
    return;
  }

  if (connection.status === 'syncing') {
    res.status(400).json({
      success: false,
      error: `Sync is already in progress for ${platform}.`,
    });
    return;
  }

  // Fire-and-forget background sync
  syncService.syncHistoricalData(userId, platform).catch(err => {
    logger.error('SyncController', `Background sync failed for ${platform}`, err);
  });

  res.json({ success: true, message: `Sync started for ${platform}` });
}
