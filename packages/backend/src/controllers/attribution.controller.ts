/**
 * Attribution Controller
 *
 * HTTP request handlers for attribution endpoints
 */

import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import * as attributionService from '../services/attribution.service';
import type { TransactionData, AttributionStats } from '../types/attribution.types';

/**
 * POST /api/attribution/run
 * Manually trigger attribution for a date range
 */
export async function runAttribution(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id; // Assuming auth middleware sets req.user

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get date range from request body (default: last 7 days)
    const { dateRange } = req.body;
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();
    const startDate = dateRange?.start
      ? new Date(dateRange.start)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    logger.info('AttributionController', 'Manual attribution triggered', {
      userId,
      startDate,
      endDate,
    });

    // Fetch unattributed transactions from raw_events
    const { data: rawEvents, error: fetchError } = await supabaseAdmin
      .from('raw_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['stripe_charge', 'paypal_transaction'])
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!rawEvents || rawEvents.length === 0) {
      res.json({
        message: 'No transactions found in date range',
        stats: {
          transactions_found: 0,
          attributed: 0,
          failed: 0,
        },
      });
      return;
    }

    // Check which ones are already attributed
    const transactionIds = rawEvents.map((e) => e.event_data.id || e.event_data.transaction_id);
    const { data: existingConversions } = await supabaseAdmin
      .from('verified_conversions')
      .select('transaction_id')
      .in('transaction_id', transactionIds);

    const existingIds = new Set(existingConversions?.map((c) => c.transaction_id) || []);
    const unattributedEvents = rawEvents.filter((e) => {
      const txnId = e.event_data.id || e.event_data.transaction_id;
      return !existingIds.has(txnId);
    });

    logger.info('AttributionController', 'Attribution run details', {
      totalTransactions: rawEvents.length,
      alreadyAttributed: existingIds.size,
      toAttribute: unattributedEvents.length,
    });

    // Run attribution for unattributed transactions
    let successCount = 0;
    let failCount = 0;

    for (const event of unattributedEvents) {
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
        logger.error('AttributionController', 'Failed to attribute transaction', {
          eventId: event.id,
          error,
        });
        failCount++;
      }
    }

    res.json({
      message: 'Attribution completed',
      stats: {
        transactions_found: rawEvents.length,
        already_attributed: existingIds.size,
        newly_attributed: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    logger.error('AttributionController', 'Error running attribution', { error });
    res.status(500).json({
      error: 'Failed to run attribution',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/attribution/status
 * Get attribution statistics for the user
 */
export async function getAttributionStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get all verified conversions for user
    const { data: conversions, error } = await supabaseAdmin
      .from('verified_conversions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    if (!conversions || conversions.length === 0) {
      res.json({
        total_conversions: 0,
        attributed_conversions: 0,
        attribution_rate: 0,
        avg_confidence_score: 0,
        by_confidence_level: {
          high: 0,
          medium: 0,
          low: 0,
        },
        by_attribution_method: {
          dual_verified: 0,
          single_source: 0,
          uncertain: 0,
        },
        over_attributed_count: 0,
      } as AttributionStats);
      return;
    }

    // Calculate stats
    const totalConversions = conversions.length;
    const attributedConversions = conversions.filter((c) => c.pixel_session_id !== null).length;
    const attributionRate = totalConversions > 0 ? (attributedConversions / totalConversions) * 100 : 0;

    const avgConfidenceScore =
      conversions.reduce((sum, c) => sum + c.confidence_score, 0) / totalConversions;

    const byConfidenceLevel = {
      high: conversions.filter((c) => c.confidence_level === 'high').length,
      medium: conversions.filter((c) => c.confidence_level === 'medium').length,
      low: conversions.filter((c) => c.confidence_level === 'low').length,
    };

    const byAttributionMethod = {
      dual_verified: conversions.filter((c) => c.attribution_method === 'dual_verified').length,
      single_source: conversions.filter((c) => c.attribution_method === 'single_source').length,
      uncertain: conversions.filter((c) => c.attribution_method === 'uncertain').length,
    };

    const overAttributedCount = conversions.filter((c) => c.is_platform_over_attributed).length;

    const stats: AttributionStats = {
      total_conversions: totalConversions,
      attributed_conversions: attributedConversions,
      attribution_rate: Math.round(attributionRate * 100) / 100,
      avg_confidence_score: Math.round(avgConfidenceScore * 100) / 100,
      by_confidence_level: byConfidenceLevel,
      by_attribution_method: byAttributionMethod,
      over_attributed_count: overAttributedCount,
    };

    res.json(stats);
  } catch (error) {
    logger.error('AttributionController', 'Error getting attribution status', { error });
    res.status(500).json({
      error: 'Failed to get attribution status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/attribution/verified-conversions
 * Get verified conversions with optional filters
 */
export async function getVerifiedConversions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse query parameters
    const {
      confidence, // 'high', 'medium', 'low'
      channel, // Filter by attributed channel
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    // Build query
    let query = supabaseAdmin
      .from('verified_conversions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (confidence) {
      query = query.eq('confidence_level', confidence);
    }

    if (channel) {
      query = query.eq('attributed_channel', channel);
    }

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate as string).toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', new Date(endDate as string).toISOString());
    }

    // Apply pagination
    query = query
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: conversions, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      data: conversions || [],
      pagination: {
        total: count || 0,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    logger.error('AttributionController', 'Error getting verified conversions', { error });
    res.status(500).json({
      error: 'Failed to get verified conversions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
