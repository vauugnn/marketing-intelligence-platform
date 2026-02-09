/**
 * Gemini AI Enhancement Service
 *
 * Generates analytical channel insights using AI.
 * Falls back to rule-based output when Gemini is unavailable or fails.
 */

import { getGeminiClient, GEMINI_MODEL, generationConfig } from '../config/gemini';
import { logger } from '../utils/logger';
import {
  getChannelPerformance,
  analyzeChannelSynergies,
  getJourneyPatterns,
  identifyChannelRoles,
  generateChannelInsights,
  getCampaignData,
} from './synergy.service';
import type {
  ChannelInsight,
  DateRange,
  ChannelPerformance,
  ChannelSynergy,
  ChannelRole,
  JourneyPattern,
  CampaignInsight,
} from '@shared/types';

// Compatibility exports / wrappers for legacy tests
export type { ChannelPerformance, ChannelSynergy } from '@shared/types';

export { calculateROI } from '@shared/utils';
import { getPerformanceRating, normalizeChannel } from '@shared/utils';

// --- Types for Gemini response validation ---

interface GeminiInsightResponse {
  channel_insights: Array<{
    channel: string;
    strengths: string[];
    weaknesses: string[];
    ai_summary: string;
    campaign_observations: string[];
  }>;
  cross_channel_observations: string[];
}

// --- In-memory cache ---

interface CacheEntry {
  data: ChannelInsight[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getCacheKey(userId: string, dateRange: DateRange, businessType: 'sales' | 'leads' = 'sales'): string {
  return `${userId}:${dateRange.start}:${dateRange.end}:${businessType}`;
}

function getCached(key: string): ChannelInsight[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ChannelInsight[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- Validation ---

function validateGeminiResponse(parsed: unknown): parsed is GeminiInsightResponse {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.channel_insights) || !Array.isArray(obj.cross_channel_observations)) return false;

  for (const insight of obj.channel_insights) {
    if (
      typeof insight !== 'object' || !insight ||
      typeof (insight as any).channel !== 'string' ||
      !Array.isArray((insight as any).strengths) ||
      !Array.isArray((insight as any).weaknesses) ||
      typeof (insight as any).ai_summary !== 'string'
    ) {
      return false;
    }
  }

  return true;
}

// --- Prompt ---

function buildPrompt(
  performance: ChannelPerformance[],
  synergies: ChannelSynergy[],
  roles: ChannelRole[],
  patterns: JourneyPattern[],
  campaignData: CampaignInsight[],
  businessType: 'sales' | 'leads' = 'sales'
): string {
  const intro = businessType === 'leads'
    ? `You are a senior marketing analytics consultant analyzing a Philippine lead generation business's marketing channels (₱ PHP currency). This business measures success by conversion volume and cost-per-lead (CPL), NOT by revenue.`
    : `You are a senior marketing analytics consultant analyzing a Philippine business's marketing channels (₱ PHP currency).`;

  return `${intro}

DO NOT recommend specific actions like "increase budget" or "cut this channel".
Instead, provide analytical observations about:

1. For each channel: What patterns show it's effective at (strengths) and where
   the data suggests room for improvement (weaknesses)
2. Cross-channel dynamics: Which channel pairs amplify each other and which may
   be weakening each other's effectiveness
3. Campaign-level observations: What the campaign data reveals about cross-platform
   performance

Be specific — reference actual numbers from the data. Keep each insight under
200 characters.

## Input Data

### Channel Performance
${JSON.stringify(performance, null, 2)}

### Channel Synergies
${JSON.stringify(synergies, null, 2)}

### Channel Roles
${JSON.stringify(roles, null, 2)}

### Top Journey Patterns
${JSON.stringify(patterns.slice(0, 15), null, 2)}

### Campaign Data
${JSON.stringify(campaignData, null, 2)}

## Output Format
Return strictly valid JSON matching this schema:
{
  "channel_insights": [
    {
      "channel": "<channel name>",
      "strengths": ["<strength observation>"],
      "weaknesses": ["<weakness observation>"],
      "ai_summary": "<2-3 sentence analytical narrative about this channel>",
      "campaign_observations": ["<campaign-specific observation>"]
    }
  ],
  "cross_channel_observations": ["<general cross-channel pattern>"]
}`;
}

// --- Merge ---

function mergeResults(
  ruleBasedInsights: ChannelInsight[],
  geminiResponse: GeminiInsightResponse
): ChannelInsight[] {
  const aiMap = new Map(geminiResponse.channel_insights.map((ai) => [ai.channel.toLowerCase(), ai]));

  return ruleBasedInsights.map((insight) => {
    const aiData = aiMap.get(insight.channel.toLowerCase());
    if (!aiData) return insight;

    return {
      ...insight,
      ai_summary: aiData.ai_summary || insight.ai_summary,
      // Merge AI strengths/weaknesses that aren't duplicates
      strengths: [...insight.strengths, ...aiData.strengths.filter(s => !insight.strengths.includes(s))],
      weaknesses: [...insight.weaknesses, ...aiData.weaknesses.filter(w => !insight.weaknesses.includes(w))],
    };
  });
}

// --- Main export ---

export async function generateAIInsights(
  userId: string,
  dateRange: DateRange,
  businessType: 'sales' | 'leads' = 'sales'
): Promise<ChannelInsight[]> {
  // 1. Fetch all analysis data once
  const [performance, synergies, roles, patterns, campaignData] = await Promise.all([
    getChannelPerformance(userId, dateRange, businessType),
    analyzeChannelSynergies(userId, dateRange, businessType),
    identifyChannelRoles(userId, dateRange),
    getJourneyPatterns(userId, dateRange, businessType),
    getCampaignData(userId, dateRange),
  ]);

  // 2. Generate rule-based insights with pre-fetched data
  const ruleBasedInsights = await generateChannelInsights(userId, dateRange, {
    synergies,
    performance,
    roles,
  }, businessType);

  if (ruleBasedInsights.length === 0) return [];

  // 3. Check cache
  const cacheKey = getCacheKey(userId, dateRange, businessType);
  const cached = getCached(cacheKey);
  if (cached) {
    logger.info('GeminiService', 'Returning cached AI insights', { userId });
    return cached;
  }

  // 4. Check if Gemini is available
  const client = getGeminiClient();
  if (!client) {
    logger.info('GeminiService', 'No Gemini API key, returning rule-based insights');
    return ruleBasedInsights;
  }

  // 5. Call Gemini API
  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig,
    });

    const prompt = buildPrompt(performance, synergies, roles, patterns, campaignData, businessType);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 6. Parse and validate
    const parsed = JSON.parse(text);

    if (!validateGeminiResponse(parsed)) {
      logger.warn('GeminiService', 'Gemini response failed schema validation, falling back');
      return ruleBasedInsights;
    }

    // 7. Merge and cache
    const merged = mergeResults(ruleBasedInsights, parsed);
    setCache(cacheKey, merged);

    logger.info('GeminiService', 'AI insight generation complete', {
      channels: parsed.channel_insights.length,
      crossChannel: parsed.cross_channel_observations.length,
    });

    return merged;
  } catch (error) {
    logger.error('GeminiService', 'Gemini API call failed, falling back to rule-based', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ruleBasedInsights;
  }
}

// --- Backwards-compatible helpers exported for existing tests ---

export function calculatePerformanceRating(roi: number, _spend?: number): string {
  const r = getPerformanceRating(roi);
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export function normalizeChannelName(input: string): string {
  const n = (input || '').toString().toLowerCase().trim();
  if (['facebook', 'fb', 'meta'].includes(n)) return 'Facebook';
  if (n.includes('google') || ['adwords', 'paid search', 'cpc'].includes(n)) return 'Google Ads';
  if (['mailchimp', 'hubspot', 'email'].includes(n)) return 'Email';
  // Title-case unknown channels
  return input
    .toString()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export function buildRecommendationPrompt(
  performance: ChannelPerformance[],
  synergies: ChannelSynergy[]
): string {
  let out = 'Channel Performance\n\n';
  for (const p of performance || []) {
    out += `${p.channel} - Revenue: ${p.revenue.toLocaleString('en-US')} Spend: ${p.spend.toLocaleString('en-US')} ROI: ${Math.round(
      p.roi
    )}%\n`;
  }

  out += '\nChannel Synergies\n\n';
  for (const s of synergies || []) {
    out += `${s.channel_a} + ${s.channel_b} - Synergy Score ${Math.round(s.synergy_score)}\n`;
  }

  out += '\nPlease return strictly valid JSON with a top-level "recommendations" array.\n';
  out += 'Recommendation types: scale, optimize, stop\n';
  return out;
}

export function generateFallbackRecommendations(
  userId: string,
  performance: ChannelPerformance[],
  synergies: ChannelSynergy[]
): any[] {
  const recs: any[] = [];

  for (const p of performance || []) {
    const rating = (p.performance_rating || '').toString().toLowerCase();
    if (rating === 'exceptional') {
      recs.push({
        user_id: userId,
        id: `rec-fallback-${recs.length + 1}`,
        type: 'scale',
        channel: p.channel,
        action: `Scale ${p.channel}`,
        reason: `High ROI (${Math.round(p.roi)}%)`,
        estimated_impact: Math.round(p.revenue * 0.1),
        confidence_score: 90,
        priority: 'high',
        is_active: true,
      });
    } else if (rating === 'satisfactory') {
      recs.push({
        user_id: userId,
        id: `rec-fallback-${recs.length + 1}`,
        type: 'optimize',
        channel: p.channel,
        action: `Optimize ${p.channel}`,
        reason: `Below target ROI (${Math.round(p.roi)}%)`,
        estimated_impact: Math.round(p.revenue * 0.05),
        confidence_score: 70,
        priority: 'medium',
        is_active: true,
      });
    } else if (rating === 'poor' || rating === 'failing') {
      recs.push({
        user_id: userId,
        id: `rec-fallback-${recs.length + 1}`,
        type: 'stop',
        channel: p.channel,
        action: `Cut ${p.channel} budget`,
        reason: `Low/negative ROI (${Math.round(p.roi)}%)`,
        estimated_impact: p.spend,
        confidence_score: 85,
        priority: rating === 'failing' ? 'high' : 'medium',
        is_active: true,
      });
    }

    if (recs.length >= 3) break;
  }

  for (const s of synergies || []) {
    if (s.synergy_score >= 2.0 && (s.confidence ?? 0) >= 50) {
      recs.push({
        user_id: userId,
        id: `rec-fallback-${recs.length + 1}`,
        type: 'scale',
        channel: `${s.channel_a} + ${s.channel_b}`,
        action: `Combine ${s.channel_a} & ${s.channel_b}`,
        reason: `Synergy ${s.synergy_score}x across ${s.frequency} conversions`,
        estimated_impact: Math.round(s.synergy_score * (s.frequency || 1)),
        confidence_score: s.confidence ?? 50,
        priority: s.synergy_score >= 3 ? 'high' : 'medium',
        is_active: true,
      });
    }
    if (recs.length >= 3) break;
  }

  return recs;
}
