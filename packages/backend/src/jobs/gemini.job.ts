/**
 * Gemini AI Recommendation Job
 *
 * Background job that runs AI analysis for all active users
 * and generates fresh marketing recommendations.
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { getGeminiClient } from '../config/gemini';
import { generateAIInsights } from '../services/gemini.service';
import type { DateRange } from '@shared/types';

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

    if (!getGeminiClient()) {
        logger.warn('GeminiJob', 'Gemini API not configured, using fallback logic');
    }

    try {
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

        const dateRange: DateRange = {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
        };

        for (const userId of userIds) {
            try {
                const insights = await generateAIInsights(userId, dateRange, 'sales');
                usersProcessed++;
                recommendationsGenerated += insights.length;

                logger.info('GeminiJob', `Processed user ${userId}`, {
                    insights: insights.length,
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

        return { success, usersProcessed, recommendationsGenerated, errors, duration };
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
