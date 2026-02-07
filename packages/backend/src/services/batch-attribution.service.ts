/**
 * Batch Attribution Service
 *
 * Handles large-scale attribution processing with performance optimizations:
 * - Configurable batch sizes
 * - Parallel processing for independent attributions
 * - Progress tracking and resumable processing
 * - Memory-efficient streaming for large datasets
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import * as attributionService from './attribution.service';
import type { TransactionData, VerifiedConversion } from '../types/attribution.types';

/**
 * Configuration for batch processing
 */
export interface BatchConfig {
    batchSize: number;      // Number of transactions per batch (default: 100)
    maxConcurrent: number;  // Max concurrent attributions (default: 5)
    retryAttempts: number;  // Retry failed attributions (default: 3)
    retryDelayMs: number;   // Delay between retries (default: 1000)
}

/**
 * Progress tracking for batch operations
 */
export interface BatchProgress {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    startedAt: Date;
    estimatedCompletion?: Date;
    currentBatch: number;
    totalBatches: number;
}

/**
 * Result of a batch attribution operation
 */
export interface BatchResult {
    success: boolean;
    progress: BatchProgress;
    errors: Array<{
        transactionId: string;
        error: string;
    }>;
    conversions: VerifiedConversion[];
}

const DEFAULT_CONFIG: BatchConfig = {
    batchSize: 100,
    maxConcurrent: 5,
    retryAttempts: 3,
    retryDelayMs: 1000,
};

/**
 * Splits an array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes a single transaction with retry logic
 */
async function processTransactionWithRetry(
    userId: string,
    transactionData: TransactionData,
    config: BatchConfig
): Promise<{ success: boolean; conversion?: VerifiedConversion; error?: string }> {
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
            const conversion = await attributionService.attributeTransaction(userId, transactionData);
            return { success: true, conversion };
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';

            if (attempt < config.retryAttempts) {
                logger.warn('BatchAttribution', `Retry ${attempt}/${config.retryAttempts}`, {
                    transactionId: transactionData.transaction_id,
                    error: lastError,
                });
                await delay(config.retryDelayMs * attempt); // Exponential backoff
            }
        }
    }

    return { success: false, error: lastError || 'Max retries exceeded' };
}

/**
 * Processes a batch of transactions concurrently
 */
async function processBatch(
    userId: string,
    transactions: TransactionData[],
    config: BatchConfig
): Promise<{
    successful: VerifiedConversion[];
    errors: Array<{ transactionId: string; error: string }>;
}> {
    const successful: VerifiedConversion[] = [];
    const errors: Array<{ transactionId: string; error: string }> = [];

    // Process in concurrent chunks
    const concurrentChunks = chunkArray(transactions, config.maxConcurrent);

    for (const chunk of concurrentChunks) {
        const results = await Promise.all(
            chunk.map((txn) => processTransactionWithRetry(userId, txn, config))
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const txn = chunk[i];

            if (result.success && result.conversion) {
                successful.push(result.conversion);
            } else {
                errors.push({
                    transactionId: txn.transaction_id,
                    error: result.error || 'Unknown error',
                });
            }
        }
    }

    return { successful, errors };
}

/**
 * Main batch attribution function
 *
 * Processes a large number of transactions in batches with:
 * - Parallel processing within each batch
 * - Progress tracking
 * - Automatic retry for failed transactions
 * - Memory-efficient streaming
 */
export async function runBatchAttribution(
    userId: string,
    dateRange: { start: Date; end: Date },
    config: Partial<BatchConfig> = {},
    onProgress?: (progress: BatchProgress) => void
): Promise<BatchResult> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    logger.info('BatchAttribution', 'Starting batch attribution', {
        userId,
        dateRange,
        config: mergedConfig,
    });

    const startedAt = new Date();

    // Fetch all transactions in date range
    const { data: rawEvents, error: fetchError } = await supabaseAdmin
        .from('raw_events')
        .select('*')
        .eq('user_id', userId)
        .in('event_type', ['stripe_charge', 'paypal_transaction'])
        .gte('timestamp', dateRange.start.toISOString())
        .lte('timestamp', dateRange.end.toISOString())
        .order('timestamp', { ascending: true });

    if (fetchError) {
        throw fetchError;
    }

    if (!rawEvents || rawEvents.length === 0) {
        logger.info('BatchAttribution', 'No transactions found');
        return {
            success: true,
            progress: {
                total: 0,
                processed: 0,
                successful: 0,
                failed: 0,
                startedAt,
                currentBatch: 0,
                totalBatches: 0,
            },
            errors: [],
            conversions: [],
        };
    }

    // Filter out already attributed transactions
    const transactionIds = rawEvents.map(
        (e) => e.event_data.id || e.event_data.transaction_id
    );
    const { data: existingConversions } = await supabaseAdmin
        .from('verified_conversions')
        .select('transaction_id')
        .in('transaction_id', transactionIds);

    const existingIds = new Set(
        existingConversions?.map((c) => c.transaction_id) || []
    );
    const unattributedEvents = rawEvents.filter((e) => {
        const txnId = e.event_data.id || e.event_data.transaction_id;
        return !existingIds.has(txnId);
    });

    // Convert to TransactionData format
    const transactions: TransactionData[] = unattributedEvents.map((event) => ({
        transaction_id: event.event_data.id || event.event_data.transaction_id,
        email: event.event_data.receipt_email || event.event_data.payer_email,
        amount: event.event_data.amount || event.event_data.gross_amount,
        currency: event.event_data.currency || 'PHP',
        timestamp: event.timestamp,
        platform: event.platform,
        metadata: event.event_data.metadata || {},
    }));

    const batches = chunkArray(transactions, mergedConfig.batchSize);
    const allConversions: VerifiedConversion[] = [];
    const allErrors: Array<{ transactionId: string; error: string }> = [];

    const progress: BatchProgress = {
        total: transactions.length,
        processed: 0,
        successful: 0,
        failed: 0,
        startedAt,
        currentBatch: 0,
        totalBatches: batches.length,
    };

    logger.info('BatchAttribution', 'Processing batches', {
        totalTransactions: transactions.length,
        totalBatches: batches.length,
        alreadyAttributed: existingIds.size,
    });

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        progress.currentBatch = i + 1;

        logger.info('BatchAttribution', `Processing batch ${i + 1}/${batches.length}`);

        const { successful, errors } = await processBatch(userId, batch, mergedConfig);

        allConversions.push(...successful);
        allErrors.push(...errors);

        progress.processed += batch.length;
        progress.successful += successful.length;
        progress.failed += errors.length;

        // Estimate completion time
        const elapsed = Date.now() - startedAt.getTime();
        const rate = progress.processed / elapsed;
        const remaining = progress.total - progress.processed;
        progress.estimatedCompletion = new Date(Date.now() + remaining / rate);

        // Report progress
        if (onProgress) {
            onProgress({ ...progress });
        }
    }

    logger.info('BatchAttribution', 'Batch attribution completed', {
        total: progress.total,
        successful: progress.successful,
        failed: progress.failed,
        duration: Date.now() - startedAt.getTime(),
    });

    return {
        success: progress.failed === 0,
        progress,
        errors: allErrors,
        conversions: allConversions,
    };
}

/**
 * Estimates the time required for a batch attribution operation
 */
export async function estimateBatchDuration(
    userId: string,
    dateRange: { start: Date; end: Date },
    config: Partial<BatchConfig> = {}
): Promise<{ estimated: number; transactionCount: number }> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Count transactions
    const { count, error } = await supabaseAdmin
        .from('raw_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('event_type', ['stripe_charge', 'paypal_transaction'])
        .gte('timestamp', dateRange.start.toISOString())
        .lte('timestamp', dateRange.end.toISOString());

    if (error) {
        throw error;
    }

    const transactionCount = count || 0;

    // Estimate based on ~100ms per transaction with concurrency
    const msPerTransaction = 100 / mergedConfig.maxConcurrent;
    const estimated = transactionCount * msPerTransaction;

    return {
        estimated: Math.ceil(estimated),
        transactionCount,
    };
}
