/**
 * Synergy Analysis Service
 *
 * Analyzes how marketing channels work together by reconstructing
 * conversion journeys from pixel events and verified conversions.
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  normalizeChannel,
  calculateROI,
  getPerformanceRating,
  calculateCPL,
  getLeadsPerformanceRating,
} from '@shared/utils';
import type {
  ConversionJourney,
  Touchpoint,
  ChannelPerformance,
  ChannelSynergy,
  JourneyPattern,
  ChannelRole,
  AIRecommendation,
  DateRange,
  BusinessType,
} from '@shared/types';

/**
 * Reconstructs conversion journeys by linking verified conversions
 * to the pixel event sessions that preceded them.
 */
export async function getConversionJourneys(
  userId: string,
  dateRange: DateRange
): Promise<ConversionJourney[]> {
  logger.info('SynergyService', 'Building conversion journeys', { userId, dateRange });

  // 1. Query verified conversions for user within date range
  const { data: conversions, error: convError } = await supabaseAdmin
    .from('verified_conversions')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', dateRange.start)
    .lte('timestamp', dateRange.end)
    .order('timestamp', { ascending: true });

  if (convError) {
    logger.error('SynergyService', 'Failed to fetch conversions', { error: convError });
    throw convError;
  }

  if (!conversions || conversions.length === 0) {
    return [];
  }

  // 2. Get user's pixel_id
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('pixel_id')
    .eq('id', userId)
    .single();

  if (userError || !user?.pixel_id) {
    logger.info('SynergyService', 'No pixel_id for user, returning single-touch journeys', { userId });
    return conversions.map((c: any) => ({
      conversion_id: c.id,
      amount: c.amount,
      channel_sequence: [normalizeChannel(c.attributed_channel || 'direct')],
      touchpoints: [],
      is_multi_touch: false,
    }));
  }

  // 3. Batch query all pixel events in expanded window (earliest conversion - 7 days to latest)
  const earliestConversion = new Date(conversions[0].timestamp);
  const latestConversion = new Date(conversions[conversions.length - 1].timestamp);
  const lookbackStart = new Date(earliestConversion.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: pixelEvents, error: pixelError } = await supabaseAdmin
    .from('pixel_events')
    .select('*')
    .eq('pixel_id', user.pixel_id)
    .gte('timestamp', lookbackStart.toISOString())
    .lte('timestamp', latestConversion.toISOString())
    .order('timestamp', { ascending: true });

  if (pixelError) {
    logger.error('SynergyService', 'Failed to fetch pixel events', { error: pixelError });
    throw pixelError;
  }

  const allEvents = pixelEvents || [];

  // 4-7. Build journeys for each conversion
  const journeys: ConversionJourney[] = [];

  for (const conversion of conversions) {
    const convTime = new Date(conversion.timestamp).getTime();
    const windowStart = convTime - 7 * 24 * 60 * 60 * 1000;

    // Filter pixel events within 7-day lookback window
    const relevantEvents = allEvents.filter((e: any) => {
      const t = new Date(e.timestamp).getTime();
      return t >= windowStart && t <= convTime;
    });

    // Group events by session_id
    const sessionMap = new Map<string, any[]>();
    for (const event of relevantEvents) {
      if (!sessionMap.has(event.session_id)) {
        sessionMap.set(event.session_id, []);
      }
      sessionMap.get(event.session_id)!.push(event);
    }

    // Build touchpoints sorted by earliest event in each session
    const touchpoints: Touchpoint[] = [];
    for (const [sessionId, events] of sessionMap.entries()) {
      events.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const first = events[0];
      const channel = normalizeChannel(first.utm_source || first.utm_medium || 'direct');

      touchpoints.push({
        session_id: sessionId,
        channel,
        timestamp: first.timestamp,
        utm_source: first.utm_source || undefined,
        utm_medium: first.utm_medium || undefined,
        utm_campaign: first.utm_campaign || undefined,
        event_count: events.length,
      });
    }

    touchpoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Build channel sequence, deduplicating consecutive same-channel entries
    const rawSequence = touchpoints.map((t) => t.channel);
    const channelSequence: string[] = [];
    for (const ch of rawSequence) {
      if (channelSequence.length === 0 || channelSequence[channelSequence.length - 1] !== ch) {
        channelSequence.push(ch);
      }
    }

    // Fallback: if no touchpoints, use the attributed channel
    if (channelSequence.length === 0) {
      channelSequence.push(normalizeChannel(conversion.attributed_channel || 'direct'));
    }

    journeys.push({
      conversion_id: conversion.id,
      amount: conversion.amount,
      channel_sequence: channelSequence,
      touchpoints,
      is_multi_touch: channelSequence.length > 1,
    });
  }

  logger.info('SynergyService', 'Journeys built', {
    total: journeys.length,
    multiTouch: journeys.filter((j) => j.is_multi_touch).length,
  });

  return journeys;
}

/**
 * Calculates per-channel performance metrics from verified conversions
 * and spend data from raw platform events.
 */
export async function getChannelPerformance(
  userId: string,
  dateRange: DateRange,
  businessType: BusinessType = 'sales'
): Promise<ChannelPerformance[]> {
  logger.info('SynergyService', 'Calculating channel performance', { userId, dateRange });

  // 1. Query verified conversions grouped by attributed_channel
  const { data: conversions, error: convError } = await supabaseAdmin
    .from('verified_conversions')
    .select('attributed_channel, amount')
    .eq('user_id', userId)
    .gte('timestamp', dateRange.start)
    .lte('timestamp', dateRange.end);

  if (convError) {
    logger.error('SynergyService', 'Failed to fetch conversions for performance', { error: convError });
    throw convError;
  }

  // Aggregate revenue and count per channel
  const channelStats = new Map<string, { revenue: number; conversions: number }>();
  for (const c of conversions || []) {
    const channel = normalizeChannel(c.attributed_channel || 'direct');
    const existing = channelStats.get(channel) || { revenue: 0, conversions: 0 };
    existing.revenue += c.amount || 0;
    existing.conversions += 1;
    channelStats.set(channel, existing);
  }

  // 2. Query raw_events for Meta/GA4 spend data
  const { data: spendEvents, error: spendError } = await supabaseAdmin
    .from('raw_events')
    .select('platform, event_data')
    .eq('user_id', userId)
    .in('platform', ['meta', 'google_analytics_4', 'google_ads', 'hubspot', 'mailchimp'])
    .gte('timestamp', dateRange.start)
    .lte('timestamp', dateRange.end);

  if (spendError) {
    logger.error('SynergyService', 'Failed to fetch spend data', { error: spendError });
    throw spendError;
  }

  // Extract spend per channel from event_data
  const channelSpend = new Map<string, number>();
  for (const event of spendEvents || []) {
    const data = event.event_data as any;
    const spend = Number(data?.spend) || Number(data?.cost) || Number(data?.amount_spent) || 0;
    if (spend > 0) {
      let channel: string;
      if (event.platform === 'meta') {
        channel = 'facebook';
      } else if (event.platform === 'google_ads') {
        channel = 'google';
      } else if (event.platform === 'hubspot' || event.platform === 'mailchimp') {
        channel = normalizeChannel(data?.channel || 'email');
      } else {
        channel = normalizeChannel(data?.channel_group || data?.sessionSource || 'google');
      }
      channelSpend.set(channel, (channelSpend.get(channel) || 0) + spend);
    }
  }

  // 3. Build performance array
  const performance: ChannelPerformance[] = [];
  for (const [channel, stats] of channelStats.entries()) {
    const spend = channelSpend.get(channel) || 0;

    if (businessType === 'leads') {
      const cpl = calculateCPL(spend, stats.conversions);
      const rating = getLeadsPerformanceRating(cpl, stats.conversions) as ChannelPerformance['performance_rating'];
      performance.push({
        channel,
        revenue: 0,
        spend,
        roi: 0,
        conversions: stats.conversions,
        cpl: cpl === Infinity ? 0 : Math.round(cpl * 100) / 100,
        performance_rating: rating,
      });
    } else {
      const roi = calculateROI(stats.revenue, spend);
      const rating = getPerformanceRating(roi) as ChannelPerformance['performance_rating'];
      performance.push({
        channel,
        revenue: stats.revenue,
        spend,
        roi,
        conversions: stats.conversions,
        performance_rating: rating,
      });
    }
  }

  // Sort by conversions for leads, revenue for sales
  if (businessType === 'leads') {
    performance.sort((a, b) => b.conversions - a.conversions);
  } else {
    performance.sort((a, b) => b.revenue - a.revenue);
  }

  return performance;
}

/**
 * Detects synergy effects between channel pairs by comparing
 * multi-touch journey revenue against solo channel revenue.
 */
export async function analyzeChannelSynergies(
  userId: string,
  dateRange: DateRange,
  businessType: BusinessType = 'sales'
): Promise<ChannelSynergy[]> {
  logger.info('SynergyService', 'Analyzing channel synergies', { userId, dateRange });

  const journeys = await getConversionJourneys(userId, dateRange);

  if (journeys.length === 0) return [];

  // Build solo revenue map (single-touch journeys)
  const soloRevenue = new Map<string, { total: number; count: number }>();
  for (const j of journeys) {
    if (!j.is_multi_touch) {
      const channel = j.channel_sequence[0];
      const existing = soloRevenue.get(channel) || { total: 0, count: 0 };
      existing.total += j.amount;
      existing.count += 1;
      soloRevenue.set(channel, existing);
    }
  }

  // Build pair co-occurrence map from multi-touch journeys
  const pairStats = new Map<string, { totalRevenue: number; count: number }>();
  for (const j of journeys) {
    if (!j.is_multi_touch) continue;

    // Get unique channels in this journey
    const uniqueChannels = [...new Set(j.channel_sequence)];

    // Generate all unique pairs
    for (let i = 0; i < uniqueChannels.length; i++) {
      for (let k = i + 1; k < uniqueChannels.length; k++) {
        const pair = [uniqueChannels[i], uniqueChannels[k]].sort().join('|');
        const existing = pairStats.get(pair) || { totalRevenue: 0, count: 0 };
        existing.totalRevenue += j.amount;
        existing.count += 1;
        pairStats.set(pair, existing);
      }
    }
  }

  // Calculate synergy scores
  const synergies: ChannelSynergy[] = [];
  for (const [pairKey, stats] of pairStats.entries()) {
    const [channelA, channelB] = pairKey.split('|');

    let synergyScore: number;

    if (businessType === 'leads') {
      // Leads: co-occurrence frequency vs expected (lift)
      const soloACount = soloRevenue.get(channelA)?.count || 0;
      const soloBCount = soloRevenue.get(channelB)?.count || 0;
      const denominator = Math.sqrt(soloACount * soloBCount);
      synergyScore = denominator > 0 ? stats.count / denominator : 1;
    } else {
      // Sales: revenue multiplier
      const avgPairRevenue = stats.totalRevenue / stats.count;
      const soloA = soloRevenue.get(channelA);
      const soloB = soloRevenue.get(channelB);
      const bestSoloAvg = Math.max(
        soloA ? soloA.total / soloA.count : 0,
        soloB ? soloB.total / soloB.count : 0
      );
      synergyScore = bestSoloAvg > 0 ? avgPairRevenue / bestSoloAvg : 1;
    }

    // Confidence from sample size: min(95, 20 + 25 * log2(frequency))
    const confidence = Math.min(95, Math.round(20 + 25 * Math.log2(stats.count)));

    synergies.push({
      channel_a: channelA,
      channel_b: channelB,
      synergy_score: Math.round(synergyScore * 100) / 100,
      frequency: stats.count,
      confidence,
    });
  }

  // Sort by synergy score descending
  synergies.sort((a, b) => b.synergy_score - a.synergy_score);

  return synergies;
}

/**
 * Groups conversion journeys into recurring patterns,
 * showing the most common paths to conversion.
 */
export async function getJourneyPatterns(
  userId: string,
  dateRange: DateRange,
  businessType: BusinessType = 'sales'
): Promise<JourneyPattern[]> {
  logger.info('SynergyService', 'Analyzing journey patterns', { userId, dateRange });

  const journeys = await getConversionJourneys(userId, dateRange);

  if (journeys.length === 0) return [];

  // Group by serialized channel_sequence
  const patternMap = new Map<string, { pattern: string[]; totalRevenue: number; count: number }>();
  for (const j of journeys) {
    const key = j.channel_sequence.join(' > ');
    const existing = patternMap.get(key) || {
      pattern: j.channel_sequence,
      totalRevenue: 0,
      count: 0,
    };
    existing.totalRevenue += j.amount;
    existing.count += 1;
    patternMap.set(key, existing);
  }

  // Convert to JourneyPattern array
  const patterns: JourneyPattern[] = [];
  for (const stats of patternMap.values()) {
    if (businessType === 'leads') {
      patterns.push({
        pattern: stats.pattern,
        frequency: stats.count,
        total_revenue: 0,
        avg_revenue: 0,
        total_conversions: stats.count,
        avg_conversions: 1,
      });
    } else {
      patterns.push({
        pattern: stats.pattern,
        frequency: stats.count,
        total_revenue: stats.totalRevenue,
        avg_revenue: Math.round((stats.totalRevenue / stats.count) * 100) / 100,
        total_conversions: stats.count,
      });
    }
  }

  // Sort by frequency descending
  patterns.sort((a, b) => b.frequency - a.frequency);

  return patterns;
}

/**
 * Classifies each channel's role in the conversion funnel:
 * introducer (first touch), closer (last touch), supporter (middle),
 * or isolated (mostly appears alone).
 */
export async function identifyChannelRoles(
  userId: string,
  dateRange: DateRange
): Promise<ChannelRole[]> {
  logger.info('SynergyService', 'Identifying channel roles', { userId, dateRange });

  const journeys = await getConversionJourneys(userId, dateRange);

  if (journeys.length === 0) return [];

  // Track positional data per channel
  const roleData = new Map<
    string,
    {
      introducer: number;
      closer: number;
      supporter: number;
      solo: number;
      totalAppearances: number;
    }
  >();

  function ensureChannel(channel: string) {
    if (!roleData.has(channel)) {
      roleData.set(channel, { introducer: 0, closer: 0, supporter: 0, solo: 0, totalAppearances: 0 });
    }
  }

  for (const j of journeys) {
    const seq = j.channel_sequence;

    if (seq.length === 1) {
      // Solo conversion
      ensureChannel(seq[0]);
      const data = roleData.get(seq[0])!;
      data.solo += 1;
      data.totalAppearances += 1;
    } else {
      // Multi-touch: first = introducer, last = closer, middle = supporter
      for (let i = 0; i < seq.length; i++) {
        ensureChannel(seq[i]);
        const data = roleData.get(seq[i])!;
        data.totalAppearances += 1;

        if (i === 0) {
          data.introducer += 1;
        } else if (i === seq.length - 1) {
          data.closer += 1;
        } else {
          data.supporter += 1;
        }
      }
    }
  }

  // Determine primary role
  const roles: ChannelRole[] = [];
  for (const [channel, data] of roleData.entries()) {
    // If >60% of appearances are solo, classify as isolated
    const soloRatio = data.totalAppearances > 0 ? data.solo / data.totalAppearances : 0;
    let primaryRole: ChannelRole['primary_role'];

    if (soloRatio > 0.6) {
      primaryRole = 'isolated';
    } else {
      // Pick the highest non-solo count
      const counts = { introducer: data.introducer, closer: data.closer, supporter: data.supporter };
      primaryRole = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as 'introducer' | 'closer' | 'supporter';
    }

    roles.push({
      channel,
      primary_role: primaryRole,
      solo_conversions: data.solo,
      assisted_conversions: data.introducer + data.closer + data.supporter,
      introducer_count: data.introducer,
      closer_count: data.closer,
      supporter_count: data.supporter,
    });
  }

  // Sort by total appearances descending
  roles.sort((a, b) => (b.solo_conversions + b.assisted_conversions) - (a.solo_conversions + a.assisted_conversions));

  return roles;
}

/**
 * Generates rule-based recommendations from synergy, performance,
 * and role analysis.
 */
export interface AnalysisData {
  synergies: ChannelSynergy[];
  performance: ChannelPerformance[];
  roles: ChannelRole[];
}

export async function generateRecommendations(
  userId: string,
  dateRange: DateRange,
  prefetched?: AnalysisData,
  businessType: BusinessType = 'sales'
): Promise<AIRecommendation[]> {
  logger.info('SynergyService', 'Generating recommendations', { userId, dateRange, businessType });

  // Use pre-fetched data or run analyses in parallel
  const [synergies, performance, roles] = prefetched
    ? [prefetched.synergies, prefetched.performance, prefetched.roles]
    : await Promise.all([
      analyzeChannelSynergies(userId, dateRange, businessType),
      getChannelPerformance(userId, dateRange, businessType),
      identifyChannelRoles(userId, dateRange),
    ]);

  const recommendations: AIRecommendation[] = [];
  let idCounter = 1;

  // Build lookup maps
  const perfMap = new Map(performance.map((p) => [p.channel, p]));
  const roleMap = new Map(roles.map((r) => [r.channel, r]));

  // Rule 1: Scale — synergy pairs with score >= 2.0 and confidence >= 50
  for (const syn of synergies) {
    if (syn.synergy_score >= 2.0 && syn.confidence >= 50) {
      const estimatedImpact = businessType === 'leads'
        ? Math.round(syn.synergy_score * syn.frequency)
        : Math.round(
            syn.synergy_score * syn.frequency * ((perfMap.get(syn.channel_a)?.revenue || 0) + (perfMap.get(syn.channel_b)?.revenue || 0)) / Math.max(1, (perfMap.get(syn.channel_a)?.conversions || 0) + (perfMap.get(syn.channel_b)?.conversions || 0))
          );

      recommendations.push({
        id: `rec-${idCounter++}`,
        type: 'scale',
        channel: `${syn.channel_a} + ${syn.channel_b}`,
        action: `Combine ${syn.channel_a} and ${syn.channel_b} campaigns — run ${syn.channel_b} retargeting on ${syn.channel_a} audience`,
        reason: `${syn.synergy_score}x synergy detected across ${syn.frequency} conversions`,
        estimated_impact: estimatedImpact,
        confidence: syn.confidence,
        priority: syn.synergy_score >= 3.0 ? 'high' : 'medium',
        why_it_matters: [
          `Strong synergy (${syn.synergy_score}x) detected between these channels`,
          `Verified across ${syn.frequency} conversion journeys`,
          businessType === 'leads'
            ? `Combined approach yields more conversions than solo performance`
            : `Combined approach yields better ROI than solo performance`
        ],
      });
    }
  }

  // Rule 2: Stop — isolated channels with poor/failing performance
  for (const role of roles) {
    if (role.primary_role === 'isolated') {
      const perf = perfMap.get(role.channel);
      if (perf && (perf.performance_rating === 'poor' || perf.performance_rating === 'failing')) {
        const metricLabel = businessType === 'leads'
          ? `CPL (₱${Math.round(perf.cpl || 0)})`
          : `ROI (${Math.round(perf.roi)}%)`;

        recommendations.push({
          id: `rec-${idCounter++}`,
          type: 'stop',
          channel: role.channel,
          action: `Cut ${role.channel} budget — reallocate to synergistic channels`,
          reason: `Isolated channel (${role.solo_conversions} solo / ${role.solo_conversions + role.assisted_conversions} total), ${perf.performance_rating} ${metricLabel}`,
          estimated_impact: perf.spend,
          confidence: 90,
          priority: perf.performance_rating === 'failing' ? 'high' : 'medium',
          why_it_matters: [
            businessType === 'leads'
              ? `Channel acts in isolation with ${perf.performance_rating} CPL`
              : `Channel acts in isolation with ${perf.performance_rating} ROI`,
            `Low contribution to other channel conversions`,
            `Budget can be better utilized in synergistic channels`
          ],
        });
      }
    }
  }

  // Rule 3: Optimize — non-isolated channels with below-target performance
  for (const role of roles) {
    if (role.primary_role !== 'isolated') {
      const perf = perfMap.get(role.channel);
      if (perf && (perf.performance_rating === 'poor' || perf.performance_rating === 'failing')) {
        const metricLabel = businessType === 'leads'
          ? `CPL is ${perf.performance_rating} (₱${Math.round(perf.cpl || 0)})`
          : `ROI is ${perf.performance_rating} (${Math.round(perf.roi)}%)`;
        const estimatedImpact = businessType === 'leads'
          ? Math.round(perf.conversions * 0.2)
          : Math.round(perf.revenue * 0.2);
        const currentMetric = businessType === 'leads'
          ? `Current CPL (₱${Math.round(perf.cpl || 0)}) is above target`
          : `Current ROI (${Math.round(perf.roi)}%) is below potential`;

        recommendations.push({
          id: `rec-${idCounter++}`,
          type: 'optimize',
          channel: role.channel,
          action: `Optimize ${role.channel} — improve targeting or reduce cost per acquisition`,
          reason: `Active in ${role.assisted_conversions} assisted conversions but ${metricLabel}`,
          estimated_impact: estimatedImpact,
          confidence: 75,
          priority: 'medium',
          why_it_matters: [
            `Critical support role in ${role.assisted_conversions} conversions`,
            currentMetric,
            `Optimization could improve overall funnel efficiency`
          ],
        });
      }
    }
  }

  // Sort: high priority first, then by estimated impact
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.estimated_impact - a.estimated_impact;
  });

  return recommendations;
}
