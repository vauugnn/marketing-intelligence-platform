import { Platform } from '@shared/types';
import { supabaseAdmin } from '../config/supabase';
import * as connectionService from './connection.service';
import { PlatformService, RawEventInput } from './platforms/base-platform.service';
import { googleAnalyticsService } from './platforms/google-analytics.service';
import { metaService } from './platforms/meta.service';
import { stripeService } from './platforms/stripe.service';
import { paypalService } from './platforms/paypal.service';
import { mailchimpService } from './platforms/mailchimp.service';
import { hubspotService } from './platforms/hubspot.service';
import { getHistoricalDateRange } from '../utils/date';
import { logger } from '../utils/logger';
import * as attributionService from './attribution.service';

/**
 * Maps platform names to their service implementations.
 */
function getPlatformService(platform: Platform): PlatformService | null {
  switch (platform) {
    case 'google_analytics_4': return googleAnalyticsService;
    case 'meta': return metaService;
    case 'stripe': return stripeService;
    case 'paypal': return paypalService;
    case 'mailchimp': return mailchimpService;
    case 'hubspot': return hubspotService;
    default: return null;
  }
}

/**
 * Splits an array into chunks of a given size for batch inserts.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetches historical data from a platform and stores it in the raw_events table.
 * This function runs asynchronously in the background after an OAuth connection.
 */
export async function syncHistoricalData(userId: string, platform: Platform): Promise<void> {
  const service = getPlatformService(platform);
  if (!service) {
    logger.warn('SyncService', `No service implementation for platform: ${platform}`);
    return;
  }

  try {
    // 1. Get the connection to retrieve the access token
    const connection = await connectionService.getConnection(userId, platform);
    if (!connection || !connection.access_token) {
      throw new Error(`No active connection found for ${platform}`);
    }

    // 2. Update status to 'syncing'
    await connectionService.updateConnectionStatus(userId, platform, 'syncing');
    logger.info('SyncService', `Starting historical sync for ${platform}`, { userId });

    // 3. Fetch historical data (last 90 days)
    const dateRange = getHistoricalDateRange(90);
    const events = await service.fetchHistoricalData(
      connection.access_token,
      dateRange,
      connection.platform_account_id || undefined
    );

    logger.info('SyncService', `Fetched ${events.length} events from ${platform}`);

    // 4. Bulk insert into raw_events (in chunks of 500)
    if (events.length > 0) {
      const chunks = chunkArray(events, 500);
      for (const chunk of chunks) {
        const rows = chunk.map((event: RawEventInput) => ({
          user_id: userId,
          platform,
          event_type: event.event_type,
          event_data: event.event_data,
          timestamp: event.timestamp,
        }));

        const { error } = await supabaseAdmin.from('raw_events').insert(rows);
        if (error) {
          logger.error('SyncService', `Failed to insert chunk for ${platform}`, error);
          throw error;
        }
      }

      logger.info('SyncService', `Inserted ${events.length} events into raw_events for ${platform}`);

      // Trigger attribution for payment platforms
      if (platform === 'stripe' || platform === 'paypal') {
        logger.info('SyncService', `Triggering attribution for ${platform} transactions`, { userId });
        try {
          await attributionService.attributeRecentTransactions(userId, events);
        } catch (attributionError) {
          // Log but don't fail the sync
          logger.error('SyncService', `Attribution failed for ${platform}`, attributionError);
        }
      }
    }

    // 5. Update connection status to 'connected' and set last_synced_at
    await connectionService.updateConnectionStatus(userId, platform, 'connected');
    await connectionService.updateLastSynced(userId, platform);
    logger.info('SyncService', `Sync completed for ${platform}`);

  } catch (error) {
    // 6. On error: set status to 'error' and store error details
    logger.error('SyncService', `Sync failed for ${platform}`, error);

    try {
      await connectionService.updateConnectionStatus(userId, platform, 'error');
    } catch (updateError) {
      logger.error('SyncService', 'Failed to update error status', updateError);
    }

    throw error;
  }
}
