/**
 * Attribution Service
 *
 * Matches Stripe/PayPal transactions to pixel events and calculates
 * attribution confidence scores for marketing channel verification.
 */

import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { normalizeChannel } from '@shared/utils';
import type {
  TransactionData,
  PixelEvent,
  PixelSession,
  AttributionMatch,
  ConfidenceResult,
  VerifiedConversion,
  GA4ValidationResult,
  OverAttributionResult,
  User,
} from '../types/attribution.types';

/**
 * Normalizes email for consistent matching
 * - Converts to lowercase
 * - Trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Finds a user by their email address
 * Returns user with pixel_id for matching against pixel events
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        logger.info('AttributionService', 'No user found for email', {
          email: normalizedEmail,
        });
        return null;
      }
      throw error;
    }

    return data as User;
  } catch (error) {
    logger.error('AttributionService', 'Error finding user by email', { error, email: normalizedEmail });
    throw error;
  }
}

/**
 * Groups pixel events by session_id and calculates session metadata
 */
function groupEventsBySession(events: PixelEvent[]): PixelSession[] {
  const sessionMap = new Map<string, PixelEvent[]>();

  // Group events by session_id
  for (const event of events) {
    if (!sessionMap.has(event.session_id)) {
      sessionMap.set(event.session_id, []);
    }
    sessionMap.get(event.session_id)!.push(event);
  }

  // Convert to PixelSession objects
  const sessions: PixelSession[] = [];
  for (const [sessionId, sessionEvents] of sessionMap.entries()) {
    // Sort by timestamp
    sessionEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Get first event's UTM params (they should be consistent across session)
    const firstEvent = sessionEvents[0];
    const timestamps = sessionEvents.map((e) => new Date(e.timestamp));

    sessions.push({
      session_id: sessionId,
      pixel_id: firstEvent.pixel_id,
      events: sessionEvents,
      first_event_timestamp: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
      last_event_timestamp: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
      utm_source: firstEvent.utm_source,
      utm_medium: firstEvent.utm_medium,
      utm_campaign: firstEvent.utm_campaign,
      utm_term: firstEvent.utm_term,
      utm_content: firstEvent.utm_content,
      has_conversion_event: sessionEvents.some((e) => e.event_type === 'conversion'),
      event_count: sessionEvents.length,
    });
  }

  return sessions;
}

/**
 * Calculates how complete the UTM parameters are for a session (0-1)
 * All 5 UTM params present = 1.0
 */
function calculateUtmCompleteness(session: PixelSession): number {
  const utmParams = [
    session.utm_source,
    session.utm_medium,
    session.utm_campaign,
    session.utm_term,
    session.utm_content,
  ];

  const presentCount = utmParams.filter((param) => param !== null && param !== '').length;
  return presentCount / 5;
}

/**
 * Calculates time proximity score (0-1)
 * Closer to transaction time = higher score
 */
function calculateTimeProximity(sessionTimestamp: Date, transactionTimestamp: Date, windowHours: number): number {
  const timeDiffMs = Math.abs(sessionTimestamp.getTime() - transactionTimestamp.getTime());
  const windowMs = windowHours * 60 * 60 * 1000;

  // Linear decay: 1.0 at 0 diff, 0.0 at window edge
  const proximity = 1 - timeDiffMs / windowMs;
  return Math.max(0, Math.min(1, proximity));
}

/**
 * Calculates composite score for ranking sessions
 * Used to pick the best matching session when multiple exist
 */
function calculateSessionScore(
  session: PixelSession,
  transactionTimestamp: Date,
  windowHours: number
): number {
  const timeProximity = calculateTimeProximity(session.last_event_timestamp, transactionTimestamp, windowHours);
  const utmCompleteness = calculateUtmCompleteness(session);
  const hasConversion = session.has_conversion_event ? 1 : 0;

  // Weighted composite score
  return timeProximity * 0.5 + utmCompleteness * 0.3 + hasConversion * 0.2;
}

/**
 * Finds pixel sessions matching a user's email within a time window
 * Returns array of sessions ranked by match quality
 */
export async function findPixelSessions(
  email: string,
  timestamp: Date,
  windowHours: number = 24
): Promise<PixelSession[]> {
  try {
    // Find user by email to get pixel_id
    const user = await findUserByEmail(email);
    if (!user || !user.pixel_id) {
      logger.info('AttributionService', 'No pixel_id found for user', { email });
      return [];
    }

    // Calculate time window (±windowHours)
    const windowStart = new Date(timestamp.getTime() - windowHours * 60 * 60 * 1000);
    const windowEnd = new Date(timestamp.getTime() + windowHours * 60 * 60 * 1000);

    // Query pixel events within time window
    const { data: pixelEvents, error } = await supabaseAdmin
      .from('pixel_events')
      .select('*')
      .eq('pixel_id', user.pixel_id)
      .gte('timestamp', windowStart.toISOString())
      .lte('timestamp', windowEnd.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    if (!pixelEvents || pixelEvents.length === 0) {
      logger.info('AttributionService', 'No pixel events found in time window', {
        email,
        windowStart,
        windowEnd,
      });
      return [];
    }

    // Group by session and calculate metadata
    const sessions = groupEventsBySession(pixelEvents as PixelEvent[]);

    // Rank sessions by composite score
    const rankedSessions = sessions
      .map((session) => ({
        ...session,
        composite_score: calculateSessionScore(session, timestamp, windowHours),
      }))
      .sort((a, b) => b.composite_score - a.composite_score);

    logger.info('AttributionService', 'Found pixel sessions', {
      email,
      sessionCount: rankedSessions.length,
    });

    return rankedSessions;
  } catch (error) {
    logger.error('AttributionService', 'Error finding pixel sessions', { error, email });
    throw error;
  }
}

/**
 * Determines the marketing channel from UTM parameters
 */
function determineChannel(session: PixelSession): string {
  // Priority: utm_source > utm_medium > 'unknown'
  if (session.utm_source) {
    return session.utm_source.toLowerCase();
  }
  if (session.utm_medium) {
    return session.utm_medium.toLowerCase();
  }
  return 'unknown';
}


/**
 * GA4 Session Match Result
 */
export interface GA4SessionMatch {
  matched: boolean;
  ga4ClientId?: string;
  pixelSessionId?: string;
  matchMethod: 'client_id' | 'utm_timestamp' | 'none';
  matchConfidence: number; // 0-1
}

/**
 * Matches GA4 session data to pixel sessions
 *
 * Uses multiple matching strategies:
 * 1. Direct client_id match (if stored)
 * 2. UTM parameter + timestamp correlation
 * 3. Page URL + referrer matching
 */
export async function matchGA4SessionToPixel(
  userId: string,
  ga4ClientId: string | null,
  timestamp: Date,
  utmParams: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  }
): Promise<GA4SessionMatch> {
  try {
    // Strategy 1: Direct client_id match (if we have GA4 client_id stored)
    if (ga4ClientId) {
      const { data: pixelEvents, error: pixelError } = await supabaseAdmin
        .from('pixel_events')
        .select('session_id, metadata')
        .eq('metadata->>ga4_client_id', ga4ClientId)
        .limit(1);

      if (!pixelError && pixelEvents && pixelEvents.length > 0) {
        logger.info('AttributionService', 'GA4 session matched via client_id', {
          ga4ClientId,
          sessionId: pixelEvents[0].session_id,
        });
        return {
          matched: true,
          ga4ClientId,
          pixelSessionId: pixelEvents[0].session_id,
          matchMethod: 'client_id',
          matchConfidence: 1.0,
        };
      }
    }

    // Strategy 2: UTM parameter + timestamp correlation
    if (utmParams.source || utmParams.medium || utmParams.campaign) {
      const windowStart = new Date(timestamp.getTime() - 30 * 60 * 1000); // -30 minutes
      const windowEnd = new Date(timestamp.getTime() + 30 * 60 * 1000); // +30 minutes

      // Find user's pixel_id
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('pixel_id')
        .eq('id', userId)
        .single();

      if (user?.pixel_id) {
        let query = supabaseAdmin
          .from('pixel_events')
          .select('session_id, utm_source, utm_medium, utm_campaign, timestamp')
          .eq('pixel_id', user.pixel_id)
          .gte('timestamp', windowStart.toISOString())
          .lte('timestamp', windowEnd.toISOString());

        // Add UTM filters
        if (utmParams.source) {
          query = query.ilike('utm_source', utmParams.source);
        }
        if (utmParams.medium) {
          query = query.ilike('utm_medium', utmParams.medium);
        }
        if (utmParams.campaign) {
          query = query.ilike('utm_campaign', utmParams.campaign);
        }

        const { data: matchingEvents, error: matchError } = await query.limit(5);

        if (!matchError && matchingEvents && matchingEvents.length > 0) {
          // Find the closest timestamp match
          let bestMatch = matchingEvents[0];
          let bestTimeDiff = Math.abs(
            new Date(bestMatch.timestamp).getTime() - timestamp.getTime()
          );

          for (const event of matchingEvents) {
            const timeDiff = Math.abs(
              new Date(event.timestamp).getTime() - timestamp.getTime()
            );
            if (timeDiff < bestTimeDiff) {
              bestMatch = event;
              bestTimeDiff = timeDiff;
            }
          }

          // Calculate confidence based on time proximity and UTM match quality
          const timeProximity = 1 - bestTimeDiff / (30 * 60 * 1000);
          const utmMatchCount = [
            utmParams.source && bestMatch.utm_source,
            utmParams.medium && bestMatch.utm_medium,
            utmParams.campaign && bestMatch.utm_campaign,
          ].filter(Boolean).length;
          const utmConfidence = utmMatchCount / 3;

          const matchConfidence = timeProximity * 0.5 + utmConfidence * 0.5;

          logger.info('AttributionService', 'GA4 session matched via UTM+timestamp', {
            sessionId: bestMatch.session_id,
            matchConfidence,
            timeDiffMs: bestTimeDiff,
          });

          return {
            matched: true,
            ga4ClientId: ga4ClientId || undefined,
            pixelSessionId: bestMatch.session_id,
            matchMethod: 'utm_timestamp',
            matchConfidence,
          };
        }
      }
    }

    // No match found
    return {
      matched: false,
      matchMethod: 'none',
      matchConfidence: 0,
    };
  } catch (error) {
    logger.error('AttributionService', 'Error matching GA4 session', { error, userId });
    return {
      matched: false,
      matchMethod: 'none',
      matchConfidence: 0,
    };
  }
}

/**
 * Validates attribution against GA4 data
 * Checks if GA4 shows traffic from the attributed channel on that date
 */
export async function validateWithGA4(
  userId: string,
  channel: string | null,
  date: Date
): Promise<GA4ValidationResult> {
  try {
    // Query for GA4 data on that specific date
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

    const { data: ga4Events, error } = await supabaseAdmin
      .from('raw_events')
      .select('event_data')
      .eq('user_id', userId)
      .eq('platform', 'google_analytics_4')
      .in('event_type', ['ga4_sessions', 'ga4_traffic_source']);

    if (error) {
      throw error;
    }

    if (!ga4Events || ga4Events.length === 0) {
      logger.info('AttributionService', 'No GA4 data available', { userId, date: dateStr });
      return {
        hasTraffic: false,
        conversionCount: 0,
        topChannels: [],
      };
    }

    // Extract channel data from GA4 events
    const channels = new Set<string>();
    let totalConversions = 0;

    for (const event of ga4Events) {
      const eventData = event.event_data as any;

      // Check if date matches
      if (eventData.date === dateStr) {
        // Extract channel
        if (eventData.channel_group) {
          channels.add(normalizeChannel(eventData.channel_group));
        }
        if (eventData.sessionSource) {
          channels.add(normalizeChannel(eventData.sessionSource));
        }

        // Sum conversions
        if (eventData.conversions) {
          totalConversions += Number(eventData.conversions) || 0;
        }
      }
    }

    const topChannels = Array.from(channels);
    const normalizedAttributedChannel = channel ? normalizeChannel(channel) : null;
    const hasTraffic = normalizedAttributedChannel
      ? topChannels.includes(normalizedAttributedChannel)
      : topChannels.length > 0;

    logger.info('AttributionService', 'GA4 validation result', {
      userId,
      date: dateStr,
      attributedChannel: channel,
      hasTraffic,
      topChannels,
      totalConversions,
    });

    return {
      hasTraffic,
      conversionCount: totalConversions,
      topChannels,
    };
  } catch (error) {
    logger.error('AttributionService', 'Error validating with GA4', { error, userId, channel });
    // Don't fail attribution if GA4 validation fails
    return {
      hasTraffic: false,
      conversionCount: 0,
      topChannels: [],
    };
  }
}

/**
 * Calculates confidence score based on attribution match quality
 *
 * Scoring:
 * - Pixel match: 0-70 points
 *   - Base: 30
 *   - Time proximity: 20
 *   - Has conversion: 10
 *   - UTM completeness: 10
 * - GA4 validation: 0-30 points
 *   - Has data: 15
 *   - Channel match: 15
 */
export function calculateConfidenceScore(match: AttributionMatch): ConfidenceResult {
  let baseScore = 0;

  // Pixel matching component (0-70 points)
  if (match.pixelMatch) {
    baseScore += 30; // Base for having a match

    if (match.pixelTimeProximity !== undefined) {
      baseScore += match.pixelTimeProximity * 20;
    }

    if (match.pixelHasConversion) {
      baseScore += 10;
    }

    if (match.pixelUtmCompleteness !== undefined) {
      baseScore += match.pixelUtmCompleteness * 10;
    }
  }

  // GA4 validation component (0-30 points)
  if (match.ga4Match) {
    baseScore += 15; // Base for GA4 having data

    // Channel alignment bonus
    if (match.pixelChannel && match.ga4Channel) {
      const pixelNormalized = normalizeChannel(match.pixelChannel);
      const ga4Normalized = normalizeChannel(match.ga4Channel);

      if (pixelNormalized === ga4Normalized) {
        baseScore += 15;
      }
    } else if (match.ga4HasTraffic) {
      baseScore += 5; // GA4 has traffic but no direct match
    }
  }

  // Handle conflicting sources
  if (match.conflictReason) {
    baseScore = Math.min(baseScore, 50); // Cap at 50 for conflicts
  }

  // Determine level and method
  let level: 'high' | 'medium' | 'low';
  let method: 'dual_verified' | 'single_source' | 'uncertain';

  if (baseScore >= 85) {
    level = 'high';
    method = 'dual_verified'; // Both pixel + GA4 confirm
  } else if (baseScore >= 70) {
    level = 'medium';
    method = match.ga4Match ? 'dual_verified' : 'single_source';
  } else if (baseScore >= 40) {
    level = 'low';
    method = 'single_source';
  } else {
    level = 'low';
    method = 'uncertain';
  }

  const result: ConfidenceResult = {
    score: Math.round(baseScore),
    level,
    method,
  };

  logger.info('AttributionService', 'Confidence score calculated', { match, result });

  return result;
}

/**
 * Detects platform over-attribution
 * Compares claimed conversions from platforms against actual sales
 */
export async function detectOverAttribution(
  userId: string,
  dateRange: { start: Date; end: Date }
): Promise<OverAttributionResult> {
  try {
    // Get actual sales from Stripe/PayPal
    const { data: actualSalesEvents, error: salesError } = await supabaseAdmin
      .from('raw_events')
      .select('event_data')
      .eq('user_id', userId)
      .in('platform', ['stripe', 'paypal'])
      .in('event_type', ['stripe_charge', 'paypal_transaction'])
      .gte('timestamp', dateRange.start.toISOString())
      .lte('timestamp', dateRange.end.toISOString());

    if (salesError) {
      throw salesError;
    }

    const actualCount = actualSalesEvents?.length || 0;

    // Get claimed conversions from Meta/GA4
    const { data: platformClaimedEvents, error: claimedError } = await supabaseAdmin
      .from('raw_events')
      .select('event_data')
      .eq('user_id', userId)
      .in('platform', ['meta', 'google_analytics_4'])
      .gte('timestamp', dateRange.start.toISOString())
      .lte('timestamp', dateRange.end.toISOString());

    if (claimedError) {
      throw claimedError;
    }

    // Sum conversions from GA4/Meta data
    let claimedCount = 0;
    if (platformClaimedEvents) {
      for (const event of platformClaimedEvents) {
        const eventData = event.event_data as any;
        if (eventData.conversions) {
          claimedCount += Number(eventData.conversions) || 0;
        }
        // Meta might have actions array
        if (eventData.actions && Array.isArray(eventData.actions)) {
          for (const action of eventData.actions) {
            if (action.action_type === 'purchase' || action.action_type === 'conversion') {
              claimedCount += Number(action.value) || 0;
            }
          }
        }
      }
    }

    const isOverAttributed = claimedCount > actualCount * 1.1; // 10% tolerance
    const discrepancy = claimedCount - actualCount;

    const result: OverAttributionResult = {
      isOverAttributed,
      details: {
        actualSales: actualCount,
        platformClaimed: claimedCount,
        discrepancy,
      },
    };

    logger.info('AttributionService', 'Over-attribution check', { userId, dateRange, result });

    return result;
  } catch (error) {
    logger.error('AttributionService', 'Error detecting over-attribution', { error, userId });
    // Don't fail attribution on over-attribution check failure
    return {
      isOverAttributed: false,
      details: {
        actualSales: 0,
        platformClaimed: 0,
        discrepancy: 0,
      },
    };
  }
}

/**
 * Main attribution function
 * Matches a transaction to pixel events and creates verified conversion record
 */
export async function attributeTransaction(
  userId: string | null,
  transactionData: TransactionData
): Promise<VerifiedConversion> {
  logger.info('AttributionService', 'Starting attribution', {
    userId,
    transactionId: transactionData.transaction_id,
    email: transactionData.email,
  });

  try {
    const transactionTimestamp = new Date(transactionData.timestamp);

    // Step 1: Find matching pixel sessions
    const pixelSessions = await findPixelSessions(transactionData.email, transactionTimestamp, 24);

    let attributionMatch: AttributionMatch;
    let bestSession: PixelSession | null = null;

    if (pixelSessions.length === 0) {
      // No pixel match - create low confidence record
      attributionMatch = {
        pixelMatch: false,
        ga4Match: false,
      };
    } else {
      // Have pixel match(es)
      bestSession = pixelSessions[0]; // Already ranked by composite score
      const channel = determineChannel(bestSession);

      // Calculate match metrics
      const timeProximity = calculateTimeProximity(
        bestSession.last_event_timestamp,
        transactionTimestamp,
        24
      );
      const utmCompleteness = calculateUtmCompleteness(bestSession);

      attributionMatch = {
        pixelMatch: true,
        pixelSessionId: bestSession.session_id,
        pixelChannel: channel,
        pixelTimeProximity: timeProximity,
        pixelHasConversion: bestSession.has_conversion_event,
        pixelUtmCompleteness: utmCompleteness,
        ga4Match: false,
        allCandidateSessions: pixelSessions.map((s) => s.session_id),
      };

      // Step 2: Validate with GA4
      if (userId) {
        const ga4Validation = await validateWithGA4(userId, channel, transactionTimestamp);

        if (ga4Validation.topChannels.length > 0) {
          attributionMatch.ga4Match = true;
          attributionMatch.ga4HasTraffic = ga4Validation.hasTraffic;
          attributionMatch.ga4ConversionCount = ga4Validation.conversionCount;

          // Check for channel alignment
          if (ga4Validation.topChannels.length > 0) {
            attributionMatch.ga4Channel = ga4Validation.topChannels[0];
          }

          // Check for conflicts
          if (
            attributionMatch.ga4Channel &&
            normalizeChannel(channel) !== normalizeChannel(attributionMatch.ga4Channel)
          ) {
            attributionMatch.conflictReason = 'channel_mismatch';
          }
        }
      }
    }

    // Step 3: Calculate confidence score
    const confidence = calculateConfidenceScore(attributionMatch);

    // Step 4: Check for over-attribution
    let isOverAttributed = false;
    if (userId) {
      const overAttribution = await detectOverAttribution(userId, {
        start: new Date(transactionTimestamp.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
        end: transactionTimestamp,
      });
      isOverAttributed = overAttribution.isOverAttributed;
    }

    // Step 5: Prepare conflicting sources array
    const conflictingSources: string[] | null =
      attributionMatch.conflictReason && attributionMatch.pixelChannel && attributionMatch.ga4Channel
        ? [attributionMatch.pixelChannel, attributionMatch.ga4Channel]
        : null;

    // Step 6: Create verified conversion record
    const verifiedConversion: VerifiedConversion = {
      user_id: userId,
      transaction_id: transactionData.transaction_id,
      email: transactionData.email || null,
      amount: transactionData.amount,
      currency: transactionData.currency,
      pixel_session_id: attributionMatch.pixelSessionId || null,
      ga4_session_id: null, // GA4 doesn't provide session IDs
      attributed_channel: attributionMatch.pixelChannel || 'direct',
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      attribution_method: confidence.method,
      is_platform_over_attributed: isOverAttributed,
      conflicting_sources: conflictingSources,
      timestamp: transactionData.timestamp,
      metadata: {
        platform: transactionData.platform,
        all_candidate_sessions: attributionMatch.allCandidateSessions,
        conflict_reason: attributionMatch.conflictReason,
        ga4_top_channels: attributionMatch.ga4Match ? [attributionMatch.ga4Channel] : [],
        reason: !attributionMatch.pixelMatch ? 'no_pixel_match' : undefined,
      },
    };

    // Step 7: Insert into database
    const { data, error } = await supabaseAdmin
      .from('verified_conversions')
      .insert(verifiedConversion)
      .select()
      .single();

    if (error) {
      // Handle duplicate transaction_id (already attributed)
      if (error.code === '23505') {
        logger.info('AttributionService', 'Transaction already attributed', {
          transactionId: transactionData.transaction_id,
        });
        // Return existing record
        const { data: existing } = await supabaseAdmin
          .from('verified_conversions')
          .select('*')
          .eq('transaction_id', transactionData.transaction_id)
          .single();
        return existing as VerifiedConversion;
      }
      throw error;
    }

    logger.info('AttributionService', 'Attribution completed', {
      transactionId: transactionData.transaction_id,
      confidenceScore: confidence.score,
      confidenceLevel: confidence.level,
      attributedChannel: attributionMatch.pixelChannel || 'direct',
    });

    return data as VerifiedConversion;
  } catch (error) {
    logger.error('AttributionService', 'Attribution failed', {
      transactionId: transactionData.transaction_id,
      error,
    });
    throw error;
  }
}

/**
 * Attributes multiple transactions in batch
 * Processes recent transactions from a sync event
 */
export async function attributeRecentTransactions(
  userId: string,
  rawEvents: any[]
): Promise<void> {
  logger.info('AttributionService', 'Batch attribution started', {
    userId,
    eventCount: rawEvents.length,
  });

  let successCount = 0;
  let errorCount = 0;

  for (const event of rawEvents) {
    try {
      const eventData = event.event_data;

      // Extract transaction data based on platform
      const transactionData: TransactionData = {
        transaction_id: eventData.id || eventData.transaction_id,
        email: eventData.receipt_email || eventData.payer_email,
        amount: eventData.amount || eventData.gross_amount,
        currency: eventData.currency || 'PHP',
        timestamp: event.timestamp,
        platform: event.platform,
        metadata: eventData.metadata || {},
      };

      await attributeTransaction(userId, transactionData);
      successCount++;
    } catch (error) {
      logger.error('AttributionService', 'Failed to attribute transaction in batch', {
        eventId: event.id,
        error,
      });
      errorCount++;
    }
  }

  logger.info('AttributionService', 'Batch attribution completed', {
    userId,
    successCount,
    errorCount,
  });
}
