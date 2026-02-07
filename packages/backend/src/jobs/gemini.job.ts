/**
 * Gemini AI Recommendation Job
 *
 * Background job that runs AI analysis for all active users
 * and generates fresh marketing recommendations.
 *
 * Scheduled: Daily at 2:00 AM
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { isGeminiAvailable } from '../config/gemini.config';
import {
    analyzeAndGenerateRecommendations,
    type RecommendationAnalysis,
} from '../services/gemini.service';

interface JobResult {
    success: boolean;
    usersProcessed: number;
    recommendationsGenerated: number;
    errors: string[];
    duration: number;
}

/**
 * Runs the daily AI recommendation job
 */
export async function runGeminiRecommendationJob(): Promise<JobResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let usersProcessed = 0;
    let recommendationsGenerated = 0;

    logger.info('GeminiJob', 'Starting AI recommendation job');

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
        logger.warn('GeminiJob', 'Gemini API not configured, using fallback logic');
    }

    try {
        // Get all users with enough data (at least some verified conversions)
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .not('pixel_id', 'is', null);

        if (error) {
            logger.error('GeminiJob', 'Failed to fetch users', { error });
            return {
                success: false,
                usersProcessed: 0,
                recommendationsGenerated: 0,
                errors: [error.message],
                duration: Date.now() - startTime,
            };
        }

        const userIds = users?.map((u) => u.id) || [];
        logger.info('GeminiJob', `Found ${userIds.length} users to process`);

        // Process each user
        for (const userId of userIds) {
            try {
                const analysis = await analyzeAndGenerateRecommendations(userId);
                usersProcessed++;
                recommendationsGenerated += analysis.recommendations.length;

                logger.info('GeminiJob', `Processed user ${userId}`, {
                    recommendations: analysis.recommendations.length,
                    totalImpact: analysis.totalEstimatedImpact,
                });
            } catch (userError) {
                const errorMsg = userError instanceof Error ? userError.message : 'Unknown error';
                errors.push(`User ${userId}: ${errorMsg}`);
                logger.error('GeminiJob', `Failed to process user ${userId}`, { error: userError });
            }
        }

        const duration = Date.now() - startTime;
        const success = errors.length === 0;

        logger.info('GeminiJob', 'Job completed', {
            success,
            usersProcessed,
            recommendationsGenerated,
            errors: errors.length,
            durationMs: duration,
        });

        return {
            success,
            usersProcessed,
            recommendationsGenerated,
            errors,
            duration,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('GeminiJob', 'Job failed', { error });

        return {
            success: false,
            usersProcessed,
            recommendationsGenerated,
            errors: [...errors, errorMsg],
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Runs AI analysis for a single user (for manual triggering)
 */
export async function runGeminiAnalysisForUser(
    userId: string
): Promise<RecommendationAnalysis> {
    logger.info('GeminiJob', `Running manual analysis for user ${userId}`);
    return analyzeAndGenerateRecommendations(userId);
}
