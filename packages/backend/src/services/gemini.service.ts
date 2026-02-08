/**
 * Gemini AI Enhancement Service
 *
 * Enhances rule-based recommendations with AI-generated narratives.
 * Falls back to rule-based output when Gemini is unavailable or fails.
 */

import { getGeminiClient, GEMINI_MODEL, generationConfig } from '../config/gemini';
import { logger } from '../utils/logger';
import {
  getChannelPerformance,
  analyzeChannelSynergies,
  getJourneyPatterns,
  identifyChannelRoles,
  generateRecommendations,
} from './synergy.service';
import type {
  AIRecommendation,
  DateRange,
  ChannelPerformance,
  ChannelSynergy,
  ChannelRole,
  JourneyPattern,
} from '@shared/types';

// Compatibility exports / wrappers for legacy tests
export type { ChannelPerformance, ChannelSynergy } from '@shared/types';

export { calculateROI } from '@shared/utils';
import { getPerformanceRating, normalizeChannel } from '@shared/utils';

// --- Types for Gemini responase validation ---

interface GeminiEnhancedRec {
  id: string;
  action: string;
  reason: string;
  ai_explanation: string;
  after_implementation: string;
  why_it_matters: string[];
}

interface GeminiAdditionalRec {
  type: 'scale' | 'optimize' | 'stop';
  channel: string;
  action: string;
  reason: string;
  ai_explanation: string;
  after_implementation: string;
  why_it_matters: string[];
  estimated_impact: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

interface GeminiResponse {
  enhanced: GeminiEnhancedRec[];
  additional: GeminiAdditionalRec[];
}

// --- In-memory cache ---

interface CacheEntry {
  data: AIRecommendation[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getCacheKey(userId: string, dateRange: DateRange): string {
  return `${userId}:${dateRange.start}:${dateRange.end}`;
}

function getCached(key: string): AIRecommendation[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: AIRecommendation[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- Validation ---

function validateGeminiResponse(parsed: unknown): parsed is GeminiResponse {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.enhanced) || !Array.isArray(obj.additional)) return false;

  for (const rec of obj.enhanced) {
    if (
      typeof rec !== 'object' || !rec ||
      typeof (rec as any).id !== 'string' ||
      typeof (rec as any).action !== 'string' ||
      typeof (rec as any).reason !== 'string' ||
      typeof (rec as any).ai_explanation !== 'string' ||
      typeof (rec as any).after_implementation !== 'string' ||
      !Array.isArray((rec as any).why_it_matters)
    ) {
      return false;
    }
  }

  for (const rec of obj.additional) {
    if (
      typeof rec !== 'object' || !rec ||
      !['scale', 'optimize', 'stop'].includes((rec as any).type) ||
      typeof (rec as any).channel !== 'string' ||
      typeof (rec as any).action !== 'string' ||
      typeof (rec as any).reason !== 'string' ||
      typeof (rec as any).ai_explanation !== 'string' ||
      typeof (rec as any).after_implementation !== 'string' ||
      !Array.isArray((rec as any).why_it_matters) ||
      typeof (rec as any).estimated_impact !== 'number' ||
      typeof (rec as any).confidence !== 'number' ||
      !['high', 'medium', 'low'].includes((rec as any).priority)
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
  ruleBasedRecs: AIRecommendation[]
): string {
  return `You are a senior marketing analytics consultant advising a Philippine business (₱ PHP currency).

## Input Data

### Channel Performance
${JSON.stringify(performance, null, 2)}

### Channel Synergies
${JSON.stringify(synergies, null, 2)}

### Channel Roles
${JSON.stringify(roles, null, 2)}

### Top Journey Patterns
${JSON.stringify(patterns.slice(0, 15), null, 2)}

### Rule-Based Recommendations
${JSON.stringify(ruleBasedRecs, null, 2)}

## Task

1. **Enhance** each rule-based recommendation:
   - Rewrite "action" with specific data references (keep under 120 characters)
   - Rewrite "reason" with concrete metrics from the data
   - Add "ai_explanation": 2-3 sentence narrative context (under 300 characters)
   - Add "after_implementation": projected outcome description
   - Add "why_it_matters": 2-4 data-grounded bullet points

2. **Identify** 0-2 additional recommendations the rules missed, based on patterns in the data.

## Constraints
- Do NOT invent data — only reference numbers from the input
- Use ₱ symbol for currency values
- Keep "action" under 120 characters
- Keep "ai_explanation" under 300 characters

## Output Format
Return strictly valid JSON matching this schema:
{
  "enhanced": [
    {
      "id": "<matching rule-based rec id>",
      "action": "<enhanced action text>",
      "reason": "<enhanced reason>",
      "ai_explanation": "<2-3 sentence narrative>",
      "after_implementation": "<projected outcome>",
      "why_it_matters": ["<bullet 1>", "<bullet 2>"]
    }
  ],
  "additional": [
    {
      "type": "scale" | "optimize" | "stop",
      "channel": "<channel name>",
      "action": "<action text>",
      "reason": "<reason>",
      "ai_explanation": "<narrative>",
      "after_implementation": "<outcome>",
      "why_it_matters": ["<bullet>"],
      "estimated_impact": <number>,
      "confidence": <number 0-100>,
      "priority": "high" | "medium" | "low"
    }
  ]
}`;
}

// --- Merge ---

function mergeResults(
  ruleBasedRecs: AIRecommendation[],
  geminiResponse: GeminiResponse
): AIRecommendation[] {
  const enhanced = new Map(geminiResponse.enhanced.map((e) => [e.id, e]));

  const merged: AIRecommendation[] = ruleBasedRecs.map((rec) => {
    const aiData = enhanced.get(rec.id);
    if (!aiData) return rec;

    return {
      ...rec,
      action: aiData.action || rec.action,
      reason: aiData.reason || rec.reason,
      ai_explanation: aiData.ai_explanation,
      after_implementation: aiData.after_implementation,
      why_it_matters: aiData.why_it_matters,
      ai_enhanced: true,
    };
  });

  // Append additional AI-identified recommendations
  for (let i = 0; i < geminiResponse.additional.length; i++) {
    const add = geminiResponse.additional[i];
    merged.push({
      id: `rec-ai-${i + 1}`,
      type: add.type,
      channel: add.channel,
      action: add.action,
      reason: add.reason,
      estimated_impact: add.estimated_impact,
      confidence: add.confidence,
      priority: add.priority,
      ai_explanation: add.ai_explanation,
      after_implementation: add.after_implementation,
      why_it_matters: add.why_it_matters,
      ai_enhanced: true,
    });
  }

  return merged;
}

// --- Main export ---

export async function enhanceRecommendationsWithAI(
  userId: string,
  dateRange: DateRange
): Promise<AIRecommendation[]> {
  // 1. Fetch all analysis data once
  const [performance, synergies, roles, patterns] = await Promise.all([
    getChannelPerformance(userId, dateRange),
    analyzeChannelSynergies(userId, dateRange),
    identifyChannelRoles(userId, dateRange),
    getJourneyPatterns(userId, dateRange),
  ]);

  // 2. Generate rule-based recommendations with pre-fetched data (no duplicate queries)
  const ruleBasedRecs = await generateRecommendations(userId, dateRange, {
    synergies,
    performance,
    roles,
  });

  if (ruleBasedRecs.length === 0) return [];

  // 3. Check cache
  const cacheKey = getCacheKey(userId, dateRange);
  const cached = getCached(cacheKey);
  if (cached) {
    logger.info('GeminiService', 'Returning cached AI recommendations', { userId });
    return cached;
  }

  // 4. Check if Gemini is available
  const client = getGeminiClient();
  if (!client) {
    logger.info('GeminiService', 'No Gemini API key, returning rule-based recommendations');
    return ruleBasedRecs;
  }

  // 5. Call Gemini API
  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig,
    });

    const prompt = buildPrompt(performance, synergies, roles, patterns, ruleBasedRecs);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 6. Parse and validate
    const parsed = JSON.parse(text);

    if (!validateGeminiResponse(parsed)) {
      logger.warn('GeminiService', 'Gemini response failed schema validation, falling back');
      return ruleBasedRecs;
    }

    // 7. Merge and cache
    const merged = mergeResults(ruleBasedRecs, parsed);
    setCache(cacheKey, merged);

    logger.info('GeminiService', 'AI enhancement complete', {
      enhanced: parsed.enhanced.length,
      additional: parsed.additional.length,
    });

    return merged;
  } catch (error) {
    logger.error('GeminiService', 'Gemini API call failed, falling back to rule-based', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ruleBasedRecs;
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

  // 1) Priority: exceptional channels -> scale
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
    } else if (rating === 'satisfactory' || rating === 'satisfactory') {
      // Satisfactory -> optimize
      if (rating === 'satisfactory') {
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
      }
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

  // 2) Synergy-based scale recommendations
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
