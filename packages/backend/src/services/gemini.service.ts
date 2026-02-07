/**
 * Gemini AI Service
 *
 * Provides AI-powered marketing recommendation generation:
 * - Analyzes channel performance data
 * - Detects channel synergies
 * - Generates actionable recommendations
 * - Calculates estimated financial impact
 * - Provides confidence scoring
 */

import { getGeminiModel, isGeminiAvailable } from '../config/gemini.config';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// Types for channel performance and recommendations
export interface ChannelPerformance {
    channel: string;
    revenue: number;
    spend: number;
    roi: number;
    conversions: number;
    performance_rating: 'Exceptional' | 'Excellent' | 'Satisfactory' | 'Poor' | 'Failing';
}

export interface ChannelSynergy {
    channel_a: string;
    channel_b: string;
    synergy_score: number;
    frequency: number;
    combined_revenue: number;
}

export interface AIRecommendation {
    id?: string;
    user_id: string;
    type: 'scale' | 'optimize' | 'stop';
    channel: string;
    action: string;
    reason: string;
    estimated_impact: number;
    confidence_score: number;
    priority: 'high' | 'medium' | 'low';
    is_active: boolean;
    created_at?: string;
    expires_at?: string;
}

export interface RecommendationAnalysis {
    channelPerformance: ChannelPerformance[];
    synergies: ChannelSynergy[];
    recommendations: AIRecommendation[];
    totalEstimatedImpact: number;
    analysisTimestamp: string;
}

/**
 * Calculates performance rating based on ROI
 */
export function calculatePerformanceRating(
    roi: number,
    spend: number
): ChannelPerformance['performance_rating'] {
    // Free channels (no spend) with revenue are exceptional
    if (spend === 0) {
        return 'Exceptional';
    }

    if (roi >= 500) return 'Exceptional';
    if (roi >= 200) return 'Excellent';
    if (roi >= 100) return 'Satisfactory';
    if (roi >= 0) return 'Poor';
    return 'Failing';
}

/**
 * Calculates ROI percentage
 */
export function calculateROI(revenue: number, spend: number): number {
    if (spend === 0) {
        return revenue > 0 ? Infinity : 0;
    }
    return Math.round(((revenue - spend) / spend) * 100);
}

/**
 * Fetches channel performance data from verified conversions
 */
export async function getChannelPerformance(
    userId: string
): Promise<ChannelPerformance[]> {
    try {
        // Get verified conversions grouped by channel
        const { data: conversions, error } = await supabaseAdmin
            .from('verified_conversions')
            .select('attributed_channel, amount')
            .eq('user_id', userId)
            .not('attributed_channel', 'is', null);

        if (error) {
            logger.error('GeminiService', 'Failed to fetch conversions', { error });
            return [];
        }

        // Get platform spend data from raw_events
        const { data: spendData, error: spendError } = await supabaseAdmin
            .from('raw_events')
            .select('platform, event_data')
            .eq('user_id', userId)
            .eq('event_type', 'campaign_spend');

        if (spendError) {
            logger.warn('GeminiService', 'Failed to fetch spend data', { error: spendError });
        }

        // Aggregate by channel
        const channelMap = new Map<string, { revenue: number; spend: number; conversions: number }>();

        for (const conv of conversions || []) {
            const channel = conv.attributed_channel || 'Unknown';
            const existing = channelMap.get(channel) || { revenue: 0, spend: 0, conversions: 0 };
            existing.revenue += parseFloat(conv.amount) || 0;
            existing.conversions += 1;
            channelMap.set(channel, existing);
        }

        // Add spend data
        for (const event of spendData || []) {
            const channel = normalizeChannelName(event.platform);
            const spend = event.event_data?.spend || 0;
            const existing = channelMap.get(channel) || { revenue: 0, spend: 0, conversions: 0 };
            existing.spend += spend;
            channelMap.set(channel, existing);
        }

        // Convert to array with calculated metrics
        const performance: ChannelPerformance[] = [];
        for (const [channel, data] of channelMap) {
            const roi = calculateROI(data.revenue, data.spend);
            performance.push({
                channel,
                revenue: data.revenue,
                spend: data.spend,
                roi: isFinite(roi) ? roi : 9999, // Cap infinity for display
                conversions: data.conversions,
                performance_rating: calculatePerformanceRating(roi, data.spend),
            });
        }

        // Sort by revenue descending
        return performance.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
        logger.error('GeminiService', 'Error in getChannelPerformance', { error });
        return [];
    }
}

/**
 * Normalizes channel names for consistent comparison
 */
export function normalizeChannelName(name: string): string {
    const normalized = name.toLowerCase().trim();

    const channelMap: Record<string, string> = {
        'facebook': 'Facebook',
        'fb': 'Facebook',
        'meta': 'Facebook',
        'google': 'Google Ads',
        'google ads': 'Google Ads',
        'google-ads': 'Google Ads',
        'adwords': 'Google Ads',
        'instagram': 'Instagram',
        'ig': 'Instagram',
        'email': 'Email',
        'mailchimp': 'Email',
        'hubspot': 'Email',
        'stripe': 'Direct',
        'paypal': 'Direct',
        'organic': 'Organic',
        'direct': 'Direct',
    };

    return channelMap[normalized] || name;
}

/**
 * Detects channel synergies from multi-touch attribution data
 */
export async function detectChannelSynergies(
    userId: string
): Promise<ChannelSynergy[]> {
    try {
        // Get pixel sessions with multiple touchpoints
        const { data: sessions, error } = await supabaseAdmin
            .from('pixel_events')
            .select('session_id, utm_source, utm_medium')
            .eq('user_id', userId)
            .not('utm_source', 'is', null);

        if (error) {
            logger.error('GeminiService', 'Failed to fetch sessions for synergy', { error });
            return [];
        }

        // Group events by session to find multi-channel journeys
        const sessionChannels = new Map<string, Set<string>>();
        for (const event of sessions || []) {
            const channel = normalizeChannelName(event.utm_source || 'Direct');
            const channels = sessionChannels.get(event.session_id) || new Set();
            channels.add(channel);
            sessionChannels.set(event.session_id, channels);
        }

        // Count channel pair occurrences
        const pairCounts = new Map<string, { count: number; revenue: number }>();
        for (const channels of sessionChannels.values()) {
            const channelArray = Array.from(channels);
            for (let i = 0; i < channelArray.length; i++) {
                for (let j = i + 1; j < channelArray.length; j++) {
                    const pair = [channelArray[i], channelArray[j]].sort().join('|');
                    const existing = pairCounts.get(pair) || { count: 0, revenue: 0 };
                    existing.count += 1;
                    pairCounts.set(pair, existing);
                }
            }
        }

        // Convert to synergy array
        const synergies: ChannelSynergy[] = [];
        for (const [pair, data] of pairCounts) {
            const [channel_a, channel_b] = pair.split('|');
            // Calculate synergy score (simplified: based on frequency)
            const synergy_score = Math.min(10, data.count / 10);
            synergies.push({
                channel_a,
                channel_b,
                synergy_score: Math.round(synergy_score * 10) / 10,
                frequency: data.count,
                combined_revenue: data.revenue,
            });
        }

        return synergies.sort((a, b) => b.synergy_score - a.synergy_score);
    } catch (error) {
        logger.error('GeminiService', 'Error in detectChannelSynergies', { error });
        return [];
    }
}

/**
 * Builds the prompt for Gemini AI recommendation generation
 */
export function buildRecommendationPrompt(
    performance: ChannelPerformance[],
    synergies: ChannelSynergy[]
): string {
    const performanceTable = performance
        .map(
            (p) =>
                `- ${p.channel}: Revenue ₱${p.revenue.toLocaleString()}, Spend ₱${p.spend.toLocaleString()}, ROI ${p.roi}%, ${p.conversions} conversions, Rating: ${p.performance_rating}`
        )
        .join('\n');

    const synergyList = synergies.slice(0, 5)
        .map(
            (s) =>
                `- ${s.channel_a} + ${s.channel_b}: Synergy Score ${s.synergy_score}/10, appeared together ${s.frequency} times`
        )
        .join('\n');

    return `You are a marketing intelligence AI analyzing channel performance data.

CHANNEL PERFORMANCE DATA:
${performanceTable}

CHANNEL SYNERGIES (channels that appear together in customer journeys):
${synergyList || 'No significant synergies detected yet.'}

Based on this data, generate exactly 3 marketing recommendations in the following JSON format:

{
  "recommendations": [
    {
      "type": "scale" | "optimize" | "stop",
      "channel": "channel name or channel combination",
      "action": "specific actionable recommendation",
      "reason": "data-driven explanation",
      "estimated_impact": number (monthly impact in PHP),
      "confidence_score": number (0-100),
      "priority": "high" | "medium" | "low"
    }
  ]
}

RULES:
1. "scale" = Keep and increase budget for high-performing channels/combinations
2. "optimize" = Improve underperforming but valuable channels
3. "stop" = Cut spending on isolated or negative ROI channels
4. estimated_impact should be realistic based on the data
5. confidence_score reflects how certain you are (more data = higher confidence)
6. Include at least one recommendation that leverages channel synergies
7. Return ONLY valid JSON, no markdown or explanation`;
}

/**
 * Generates AI-powered recommendations using Gemini
 */
export async function generateRecommendations(
    userId: string,
    performance: ChannelPerformance[],
    synergies: ChannelSynergy[]
): Promise<AIRecommendation[]> {
    const model = getGeminiModel();

    if (!model) {
        logger.warn('GeminiService', 'Gemini not available, returning fallback recommendations');
        return generateFallbackRecommendations(userId, performance, synergies);
    }

    try {
        const prompt = buildRecommendationPrompt(performance, synergies);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse the JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            logger.error('GeminiService', 'Failed to parse Gemini response', { text });
            return generateFallbackRecommendations(userId, performance, synergies);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const recommendations: AIRecommendation[] = (parsed.recommendations || []).map(
            (rec: any) => ({
                user_id: userId,
                type: rec.type,
                channel: rec.channel,
                action: rec.action,
                reason: rec.reason,
                estimated_impact: rec.estimated_impact || 0,
                confidence_score: Math.min(100, Math.max(0, rec.confidence_score || 70)),
                priority: rec.priority || 'medium',
                is_active: true,
            })
        );

        logger.info('GeminiService', 'Generated recommendations', {
            userId,
            count: recommendations.length,
        });

        return recommendations;
    } catch (error) {
        logger.error('GeminiService', 'Gemini API error', { error });
        return generateFallbackRecommendations(userId, performance, synergies);
    }
}

/**
 * Generates fallback recommendations when Gemini is unavailable
 * Uses rule-based logic based on performance data
 */
export function generateFallbackRecommendations(
    userId: string,
    performance: ChannelPerformance[],
    synergies: ChannelSynergy[]
): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Find best performing channel to scale
    const bestChannel = performance.find(
        (p) => p.performance_rating === 'Exceptional' || p.performance_rating === 'Excellent'
    );
    if (bestChannel) {
        recommendations.push({
            user_id: userId,
            type: 'scale',
            channel: bestChannel.channel,
            action: `Increase ${bestChannel.channel} budget by 20%`,
            reason: `${bestChannel.channel} has ${bestChannel.roi}% ROI with ₱${bestChannel.revenue.toLocaleString()} revenue`,
            estimated_impact: Math.round(bestChannel.revenue * 0.2),
            confidence_score: 85,
            priority: 'high',
            is_active: true,
        });
    }

    // Find channel to optimize
    const optimizeChannel = performance.find(
        (p) => p.performance_rating === 'Satisfactory' || p.performance_rating === 'Poor'
    );
    if (optimizeChannel) {
        recommendations.push({
            user_id: userId,
            type: 'optimize',
            channel: optimizeChannel.channel,
            action: `Improve ${optimizeChannel.channel} landing pages or targeting`,
            reason: `${optimizeChannel.channel} has potential but only ${optimizeChannel.roi}% ROI`,
            estimated_impact: Math.round(optimizeChannel.spend * 0.3),
            confidence_score: 70,
            priority: 'medium',
            is_active: true,
        });
    }

    // Find channel to stop
    const stopChannel = performance.find((p) => p.performance_rating === 'Failing');
    if (stopChannel) {
        recommendations.push({
            user_id: userId,
            type: 'stop',
            channel: stopChannel.channel,
            action: `Cut ${stopChannel.channel} budget to save ₱${stopChannel.spend.toLocaleString()}/month`,
            reason: `${stopChannel.channel} is losing money with ${stopChannel.roi}% ROI`,
            estimated_impact: stopChannel.spend,
            confidence_score: 90,
            priority: 'high',
            is_active: true,
        });
    }

    // Add synergy recommendation if available
    const topSynergy = synergies[0];
    if (topSynergy && recommendations.length < 3) {
        recommendations.push({
            user_id: userId,
            type: 'scale',
            channel: `${topSynergy.channel_a} + ${topSynergy.channel_b}`,
            action: `Coordinate ${topSynergy.channel_a} and ${topSynergy.channel_b} campaigns`,
            reason: `These channels have ${topSynergy.synergy_score}x synergy when combined`,
            estimated_impact: 15000,
            confidence_score: 75,
            priority: 'medium',
            is_active: true,
        });
    }

    return recommendations.slice(0, 3);
}

/**
 * Saves recommendations to the database
 */
export async function saveRecommendations(
    recommendations: AIRecommendation[]
): Promise<void> {
    if (recommendations.length === 0) return;

    const userId = recommendations[0].user_id;

    try {
        // Deactivate old recommendations for this user
        await supabaseAdmin
            .from('ai_recommendations')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true);

        // Insert new recommendations
        const { error } = await supabaseAdmin.from('ai_recommendations').insert(
            recommendations.map((rec) => ({
                user_id: rec.user_id,
                type: rec.type,
                channel: rec.channel,
                action: rec.action,
                reason: rec.reason,
                estimated_impact: rec.estimated_impact,
                confidence_score: rec.confidence_score,
                priority: rec.priority,
                is_active: true,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            }))
        );

        if (error) {
            logger.error('GeminiService', 'Failed to save recommendations', { error });
            throw error;
        }

        logger.info('GeminiService', 'Saved recommendations', {
            userId,
            count: recommendations.length,
        });
    } catch (error) {
        logger.error('GeminiService', 'Error saving recommendations', { error });
        throw error;
    }
}

/**
 * Fetches active recommendations for a user
 */
export async function getActiveRecommendations(
    userId: string
): Promise<AIRecommendation[]> {
    try {
        const { data, error } = await supabaseAdmin
            .from('ai_recommendations')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .order('confidence_score', { ascending: false });

        if (error) {
            logger.error('GeminiService', 'Failed to fetch recommendations', { error });
            return [];
        }

        return data || [];
    } catch (error) {
        logger.error('GeminiService', 'Error fetching recommendations', { error });
        return [];
    }
}

/**
 * Runs full analysis and generates recommendations for a user
 */
export async function analyzeAndGenerateRecommendations(
    userId: string
): Promise<RecommendationAnalysis> {
    logger.info('GeminiService', 'Starting analysis', { userId });

    // Get channel performance data
    const channelPerformance = await getChannelPerformance(userId);

    // Detect synergies
    const synergies = await detectChannelSynergies(userId);

    // Generate recommendations
    const recommendations = await generateRecommendations(
        userId,
        channelPerformance,
        synergies
    );

    // Save to database
    if (recommendations.length > 0) {
        await saveRecommendations(recommendations);
    }

    // Calculate total impact
    const totalEstimatedImpact = recommendations.reduce(
        (sum, rec) => sum + rec.estimated_impact,
        0
    );

    logger.info('GeminiService', 'Analysis complete', {
        userId,
        recommendationCount: recommendations.length,
        totalImpact: totalEstimatedImpact,
    });

    return {
        channelPerformance,
        synergies,
        recommendations,
        totalEstimatedImpact,
        analysisTimestamp: new Date().toISOString(),
    };
}
