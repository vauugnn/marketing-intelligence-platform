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
  ChannelInsight,
  CrossChannelEffect,
  CampaignInsight,
  SynergyStatus,
  DateRange,
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
  businessType: 'sales' | 'leads' = 'sales'
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
 * Falls back to performance-based synergy estimation when no
 * multi-touch journey data is available.
 */
export async function analyzeChannelSynergies(
  userId: string,
  dateRange: DateRange,
  businessType: 'sales' | 'leads' = 'sales'
): Promise<ChannelSynergy[]> {
  logger.info('SynergyService', 'Analyzing channel synergies', { userId, dateRange });

  const journeys = await getConversionJourneys(userId, dateRange);
  const multiTouchJourneys = journeys.filter(j => j.is_multi_touch);

  // If we have multi-touch journeys, calculate real synergies
  if (multiTouchJourneys.length > 0) {
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
    for (const j of multiTouchJourneys) {
      const uniqueChannels = [...new Set(j.channel_sequence)];
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
        const soloACount = soloRevenue.get(channelA)?.count || 0;
        const soloBCount = soloRevenue.get(channelB)?.count || 0;
        const denominator = Math.sqrt(soloACount * soloBCount);
        synergyScore = denominator > 0 ? stats.count / denominator : 1;
      } else {
        const avgPairRevenue = stats.totalRevenue / stats.count;
        const soloA = soloRevenue.get(channelA);
        const soloB = soloRevenue.get(channelB);
        const bestSoloAvg = Math.max(
          soloA ? soloA.total / soloA.count : 0,
          soloB ? soloB.total / soloB.count : 0
        );
        synergyScore = bestSoloAvg > 0 ? avgPairRevenue / bestSoloAvg : 1;
      }

      const confidence = Math.min(95, Math.round(20 + 25 * Math.log2(stats.count)));
      const roundedScore = Math.round(synergyScore * 100) / 100;

      synergies.push({
        channel_a: channelA,
        channel_b: channelB,
        synergy_score: roundedScore,
        frequency: stats.count,
        confidence,
        status: getSynergyStatus(roundedScore),
      });
    }

    synergies.sort((a, b) => b.synergy_score - a.synergy_score);
    return synergies;
  }

  // FALLBACK: Generate performance-based synergies when no multi-touch data exists
  logger.info('SynergyService', 'No multi-touch journeys, generating performance-based synergies', { userId });

  const performance = await getChannelPerformance(userId, dateRange, businessType);

  if (performance.length < 2) {
    return []; // Need at least 2 channels to create connections
  }

  // Map performance ratings to numeric scores for synergy calculation
  const ratingScore: Record<string, number> = {
    'exceptional': 5,
    'excellent': 4,
    'satisfactory': 3,
    'poor': 2,
    'failing': 1,
  };

  const synergies: ChannelSynergy[] = [];

  // Generate synergies between all unique channel pairs
  for (let i = 0; i < performance.length; i++) {
    for (let j = i + 1; j < performance.length; j++) {
      const channelA = performance[i];
      const channelB = performance[j];

      const scoreA = ratingScore[channelA.performance_rating] || 2;
      const scoreB = ratingScore[channelB.performance_rating] || 2;

      // Calculate synergy score based on combined performance
      // Higher scores when both channels perform well = better synergy potential
      const avgScore = (scoreA + scoreB) / 2;
      // Normalize to synergy scale: 1.0 = neutral, >1.5 = strong, <1.0 = weak
      const synergyScore = avgScore / 3; // Maps 1-5 to ~0.33-1.67

      // Confidence is lower for estimated synergies (based on conversions count)
      const totalConversions = channelA.conversions + channelB.conversions;
      const confidence = Math.min(70, Math.round(30 + Math.log2(totalConversions + 1) * 10));

      const roundedScore = Math.round(synergyScore * 100) / 100;
      synergies.push({
        channel_a: channelA.channel,
        channel_b: channelB.channel,
        synergy_score: roundedScore,
        frequency: totalConversions,
        confidence,
        status: getSynergyStatus(roundedScore),
      });
    }
  }

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
  businessType: 'sales' | 'leads' = 'sales'
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
 * Maps a synergy score to a status label.
 */
function getSynergyStatus(score: number): SynergyStatus {
  if (score >= 1.5) return 'strong';
  if (score >= 1.0) return 'needs_improvement';
  if (score >= 0.5) return 'needs_attention';
  return 'urgent';
}

/**
 * Analysis data bundle for channel insights generation.
 */
export interface AnalysisData {
  synergies: ChannelSynergy[];
  performance: ChannelPerformance[];
  roles: ChannelRole[];
}

/**
 * Queries pixel_events grouped by utm_campaign to return campaign-level metrics.
 */
export async function getCampaignData(
  userId: string,
  dateRange: DateRange
): Promise<CampaignInsight[]> {
  logger.info('SynergyService', 'Fetching campaign data', { userId, dateRange });

  // Get user's pixel_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('pixel_id')
    .eq('id', userId)
    .single();

  if (!user?.pixel_id) return [];

  // Get conversion pixel events with campaign data
  const { data: events, error } = await supabaseAdmin
    .from('pixel_events')
    .select('utm_campaign, utm_source, session_id, event_type, metadata')
    .eq('pixel_id', user.pixel_id)
    .not('utm_campaign', 'is', null)
    .gte('timestamp', dateRange.start)
    .lte('timestamp', dateRange.end);

  if (error || !events) return [];

  // Group by campaign
  const campaignMap = new Map<string, { channel: string; sessions: Set<string>; conversions: number }>();
  for (const e of events) {
    const campaign = e.utm_campaign;
    if (!campaign) continue;
    const channel = normalizeChannel(e.utm_source || 'direct');
    const key = `${campaign}|${channel}`;
    if (!campaignMap.has(key)) {
      campaignMap.set(key, { channel, sessions: new Set(), conversions: 0 });
    }
    const entry = campaignMap.get(key)!;
    entry.sessions.add(e.session_id);
    if (e.event_type === 'conversion') entry.conversions += 1;
  }

  // Find campaigns that appear across multiple channels
  const campaignChannels = new Map<string, Set<string>>();
  for (const [key] of campaignMap) {
    const [campaign, channel] = key.split('|');
    if (!campaignChannels.has(campaign)) campaignChannels.set(campaign, new Set());
    campaignChannels.get(campaign)!.add(channel);
  }

  const insights: CampaignInsight[] = [];
  for (const [key, data] of campaignMap) {
    const [campaign, channel] = key.split('|');
    const otherChannels = campaignChannels.get(campaign);
    const crossPlatform = otherChannels && otherChannels.size > 1
      ? `Also appears on ${[...otherChannels].filter(c => c !== channel).join(', ')}`
      : undefined;

    insights.push({
      campaign_name: campaign,
      channel,
      observation: `${data.sessions.size} sessions, ${data.conversions} conversions`,
      cross_platform_impact: crossPlatform,
    });
  }

  return insights;
}

/**
 * Generates per-channel insight objects from synergy, performance,
 * role, and campaign analysis data.
 */
export async function generateChannelInsights(
  userId: string,
  dateRange: DateRange,
  prefetched?: AnalysisData,
  businessType: 'sales' | 'leads' = 'sales'
): Promise<ChannelInsight[]> {
  logger.info('SynergyService', 'Generating channel insights', { userId, dateRange, businessType });

  const [synergies, performance, roles, campaignData] = prefetched
    ? [prefetched.synergies, prefetched.performance, prefetched.roles, await getCampaignData(userId, dateRange)]
    : await Promise.all([
      analyzeChannelSynergies(userId, dateRange, businessType),
      getChannelPerformance(userId, dateRange, businessType),
      identifyChannelRoles(userId, dateRange),
      getCampaignData(userId, dateRange),
    ]);

  const perfMap = new Map(performance.map((p) => [p.channel, p]));
  const roleMap = new Map(roles.map((r) => [r.channel, r]));

  // Build synergy lookup per channel
  const channelSynergies = new Map<string, ChannelSynergy[]>();
  for (const syn of synergies) {
    if (!channelSynergies.has(syn.channel_a)) channelSynergies.set(syn.channel_a, []);
    if (!channelSynergies.has(syn.channel_b)) channelSynergies.set(syn.channel_b, []);
    channelSynergies.get(syn.channel_a)!.push(syn);
    channelSynergies.get(syn.channel_b)!.push(syn);
  }

  // Build campaign lookup per channel
  const channelCampaigns = new Map<string, CampaignInsight[]>();
  for (const ci of campaignData) {
    if (!channelCampaigns.has(ci.channel)) channelCampaigns.set(ci.channel, []);
    channelCampaigns.get(ci.channel)!.push(ci);
  }

  const insights: ChannelInsight[] = [];

  for (const perf of performance) {
    const channel = perf.channel;
    const role = roleMap.get(channel);
    const syns = channelSynergies.get(channel) || [];
    const campaigns = channelCampaigns.get(channel) || [];

    // Derive strengths
    const strengths: string[] = [];
    if (perf.performance_rating === 'exceptional' || perf.performance_rating === 'excellent') {
      if (businessType === 'leads') {
        strengths.push(`Strong performer — CPL of ₱${Math.round(perf.cpl || 0)} across ${perf.conversions} conversions`);
      } else {
        strengths.push(`High ROI at ${Math.round(perf.roi)}% across ${perf.conversions} conversions`);
      }
    }
    if (role) {
      const totalApp = role.solo_conversions + role.assisted_conversions;
      if (role.primary_role === 'introducer' && totalApp > 0) {
        const pct = Math.round((role.introducer_count / totalApp) * 100);
        strengths.push(`Strong introducer — first touch in ${pct}% of multi-touch journeys`);
      } else if (role.primary_role === 'closer' && totalApp > 0) {
        const pct = Math.round((role.closer_count / totalApp) * 100);
        strengths.push(`Strong closer — last touch in ${pct}% of multi-touch conversions`);
      } else if (role.primary_role === 'supporter' && totalApp > 0) {
        strengths.push(`Key supporter — assists in ${role.assisted_conversions} multi-touch journeys`);
      }
    }
    const strongSyns = syns.filter(s => s.synergy_score >= 1.5);
    if (strongSyns.length > 0) {
      strengths.push(`Strong synergy with ${strongSyns.length} channel${strongSyns.length > 1 ? 's' : ''}`);
    }
    if (strengths.length === 0) {
      strengths.push(`Active channel with ${perf.conversions} conversions in period`);
    }

    // Derive weaknesses
    const weaknesses: string[] = [];
    if (perf.performance_rating === 'poor' || perf.performance_rating === 'failing') {
      if (businessType === 'leads') {
        weaknesses.push(`${perf.performance_rating} CPL (₱${Math.round(perf.cpl || 0)}) — above target threshold`);
      } else {
        weaknesses.push(`${perf.performance_rating} ROI (${Math.round(perf.roi)}%) — below target threshold`);
      }
    }
    if (role?.primary_role === 'isolated') {
      const totalApp = role.solo_conversions + role.assisted_conversions;
      const soloRatio = totalApp > 0 ? Math.round((role.solo_conversions / totalApp) * 100) : 0;
      weaknesses.push(`Operates in isolation — ${soloRatio}% solo conversion ratio`);
    }
    const weakSyns = syns.filter(s => s.synergy_score < 0.5);
    if (weakSyns.length > 0) {
      weaknesses.push(`Urgent synergy status with ${weakSyns.length} channel pair${weakSyns.length > 1 ? 's' : ''}`);
    }

    // Cross-channel effects
    const crossChannelEffects: CrossChannelEffect[] = [];
    for (const syn of syns) {
      const targetChannel = syn.channel_a === channel ? syn.channel_b : syn.channel_a;
      const effect: CrossChannelEffect['effect'] = syn.synergy_score > 1.0 ? 'amplifies' : syn.synergy_score < 1.0 ? 'weakens' : 'neutral';
      const description = effect === 'amplifies'
        ? `${channel} audiences convert better when also exposed to ${targetChannel}`
        : effect === 'weakens'
          ? `Combined ${channel} + ${targetChannel} journeys underperform solo conversions`
          : `Neutral interaction between ${channel} and ${targetChannel}`;

      crossChannelEffects.push({
        target_channel: targetChannel,
        effect,
        magnitude: syn.synergy_score,
        description,
      });
    }

    // Confidence based on data volume
    const totalAppearances = role ? role.solo_conversions + role.assisted_conversions : perf.conversions;
    const confidence = Math.min(95, Math.round(30 + 20 * Math.log2(Math.max(1, totalAppearances))));

    insights.push({
      id: `insight-${channel}`,
      channel,
      strengths,
      weaknesses,
      cross_channel_effects: crossChannelEffects,
      campaign_insights: campaigns,
      ai_summary: '',
      confidence,
    });
  }

  return insights;
}
