/**
 * Attribution Job
 *
 * Scheduled job that runs daily to catch any missed attributions
 * Processes unattributed transactions from the previous day
 */

import { supabaseAdmin } from '../config/supabase';
import * as attributionService from '../services/attribution.service';
import { logger } from '../utils/logger';
import type { TransactionData } from '../types/attribution.types';

/**
 * Runs daily attribution job for all users
 * Finds transactions from yesterday that haven't been attributed yet
 */
export async function runDailyAttributionJob(): Promise<void> {
  logger.info('AttributionJob', 'Starting daily attribution job');

  try {
    // Calculate yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    logger.info('AttributionJob', 'Processing date range', {
      start: yesterday.toISOString(),
      end: today.toISOString(),
    });

    // Find all payment transactions from yesterday
    const { data: rawEvents, error: fetchError } = await supabaseAdmin
      .from('raw_events')
      .select('*')
      .in('event_type', ['stripe_charge', 'paypal_transaction'])
      .gte('timestamp', yesterday.toISOString())
      .lt('timestamp', today.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!rawEvents || rawEvents.length === 0) {
      logger.info('AttributionJob', 'No transactions found for yesterday');
      return;
    }

    logger.info('AttributionJob', `Found ${rawEvents.length} transactions from yesterday`);

    // Check which ones already have verified_conversions
    const transactionIds = rawEvents.map((e) => e.event_data.id || e.event_data.transaction_id);
    const { data: existingConversions, error: convError } = await supabaseAdmin
      .from('verified_conversions')
      .select('transaction_id')
      .in('transaction_id', transactionIds);

    if (convError) {
      throw convError;
    }

    const existingIds = new Set(existingConversions?.map((c) => c.transaction_id) || []);

    // Filter to unattributed transactions
    const unattributed = rawEvents.filter((e) => {
      const txnId = e.event_data.id || e.event_data.transaction_id;
      return !existingIds.has(txnId);
    });

    logger.info('AttributionJob', 'Attribution summary', {
      total: rawEvents.length,
      alreadyAttributed: existingIds.size,
      toAttribute: unattributed.length,
    });

    if (unattributed.length === 0) {
      logger.info('AttributionJob', 'All transactions already attributed');
      return;
    }

    // Process each unattributed transaction
    let successCount = 0;
    let failCount = 0;

    for (const event of unattributed) {
      try {
        const eventData = event.event_data;

        const transactionData: TransactionData = {
          transaction_id: eventData.id || eventData.transaction_id,
          email: eventData.receipt_email || eventData.payer_email,
          amount: eventData.amount || eventData.gross_amount,
          currency: eventData.currency || 'PHP',
          timestamp: event.timestamp,
          platform: event.platform,
          metadata: eventData.metadata || {},
        };

        await attributionService.attributeTransaction(event.user_id, transactionData);
        successCount++;
      } catch (error) {
        logger.error('AttributionJob', 'Failed to attribute transaction', {
          eventId: event.id,
          transactionId: event.event_data.id || event.event_data.transaction_id,
          error,
        });
        failCount++;
      }
    }

    logger.info('AttributionJob', 'Daily attribution job completed', {
      total: unattributed.length,
      success: successCount,
      failed: failCount,
    });
  } catch (error) {
    logger.error('AttributionJob', 'Daily attribution job failed', { error });
    throw error;
  }
}

/**
 * Runs attribution for a specific user and date range
 * Useful for backfilling historical data
 */
export async function runAttributionForUser(
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<{ success: number; failed: number }> {
  logger.info('AttributionJob', 'Running attribution for user', {
    userId,
    dateRange,
  });

  try {
    // Fetch transactions in date range
    const { data: rawEvents, error: fetchError } = await supabaseAdmin
      .from('raw_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['stripe_charge', 'paypal_transaction'])
      .gte('timestamp', dateRange.start.toISOString())
      .lte('timestamp', dateRange.end.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!rawEvents || rawEvents.length === 0) {
      logger.info('AttributionJob', 'No transactions found for user', { userId });
      return { success: 0, failed: 0 };
    }

    // Check for existing attributions
    const transactionIds = rawEvents.map((e) => e.event_data.id || e.event_data.transaction_id);
    const { data: existingConversions } = await supabaseAdmin
      .from('verified_conversions')
      .select('transaction_id')
      .in('transaction_id', transactionIds);

    const existingIds = new Set(existingConversions?.map((c) => c.transaction_id) || []);
    const unattributed = rawEvents.filter((e) => {
      const txnId = e.event_data.id || e.event_data.transaction_id;
      return !existingIds.has(txnId);
    });

    // Process each transaction
    let successCount = 0;
    let failCount = 0;

    for (const event of unattributed) {
      try {
        const eventData = event.event_data;

        const transactionData: TransactionData = {
          transaction_id: eventData.id || eventData.transaction_id,
          email: eventData.receipt_email || eventData.payer_email,
          amount: eventData.amount || eventData.gross_amount,
          currency: eventData.currency || 'PHP',
          timestamp: event.timestamp,
          platform: event.platform,
          metadata: eventData.metadata || {},
        };

        await attributionService.attributeTransaction(userId, transactionData);
        successCount++;
      } catch (error) {
        logger.error('AttributionJob', 'Failed to attribute transaction', {
          userId,
          eventId: event.id,
          error,
        });
        failCount++;
      }
    }

    logger.info('AttributionJob', 'User attribution completed', {
      userId,
      success: successCount,
      failed: failCount,
    });

    return { success: successCount, failed: failCount };
  } catch (error) {
    logger.error('AttributionJob', 'User attribution failed', { userId, error });
    throw error;
  }
}
