import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase';
import { PixelEventInput } from '../validators/pixel.validator';
import type { PixelSession, PixelEvent } from '../types/attribution.types';

export class PixelService {
  /**
   * Generate a dedup key from event fields to prevent duplicate events
   */
  private generateDedupKey(event: PixelEventInput): string {
    const raw = event.event_type === 'page_view'
      ? `${event.pixel_id}|${event.session_id}|${event.event_type}|${event.page_url}`
      : `${event.pixel_id}|${event.session_id}|${event.event_type}|${event.page_url}|${event.timestamp}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Get existing pixel ID for user or create a new one
   */
  async getOrCreatePixel(userId: string): Promise<string> {
    // Check for existing pixel
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('pixel_id')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user: ${fetchError.message}`);
    }

    if (user?.pixel_id) {
      return user.pixel_id;
    }

    // Generate new pixel ID
    const pixelId = `pix_${crypto.randomUUID().replace(/-/g, '')}`;

    // Store in user profile
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ pixel_id: pixelId })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to assign pixel ID: ${updateError.message}`);
    }

    return pixelId;
  }

  /**
   * Store pixel event in database (deduplicates via upsert)
   */
  async storeEvent(
    event: PixelEventInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ id: string }> {
    const dedupKey = this.generateDedupKey(event);

    const { data, error } = await supabaseAdmin
      .from('pixel_events')
      .upsert({
        pixel_id: event.pixel_id,
        session_id: event.session_id,
        event_type: event.event_type,
        page_url: event.page_url,
        referrer: event.referrer || null,
        utm_source: event.utm_source || null,
        utm_medium: event.utm_medium || null,
        utm_campaign: event.utm_campaign || null,
        utm_term: event.utm_term || null,
        utm_content: event.utm_content || null,
        timestamp: event.timestamp,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
        metadata: event.metadata || null,
        dedup_key: dedupKey,
        // Extract metadata fields if available
        page_title: event.metadata?.page_title || null,
        visitor_id: event.metadata?.visitor_id || null,
        visitor_email: event.metadata?.email || null,
        visitor_name: event.metadata?.name || null,
        value: event.metadata?.value ? parseFloat(event.metadata.value) || null : null,
        currency: event.metadata?.currency || 'PHP',
      }, { onConflict: 'dedup_key' })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store pixel event: ${error.message}`);
    }

    return { id: data.id };
  }

  /**
   * Get all sessions for a pixel ID, grouped by session_id
   */
  async getSessionsByPixelId(pixelId: string): Promise<PixelSession[]> {
    const { data: events, error } = await supabaseAdmin
      .from('pixel_events')
      .select('*')
      .eq('pixel_id', pixelId)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pixel events: ${error.message}`);
    }

    if (!events || events.length === 0) {
      return [];
    }

    // Group events by session_id (same logic as attribution.service.ts)
    const sessionMap = new Map<string, PixelEvent[]>();
    for (const event of events as PixelEvent[]) {
      if (!sessionMap.has(event.session_id)) {
        sessionMap.set(event.session_id, []);
      }
      sessionMap.get(event.session_id)!.push(event);
    }

    const sessions: PixelSession[] = [];
    for (const [sessionId, sessionEvents] of sessionMap.entries()) {
      sessionEvents.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

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

    // Sort sessions by most recent first
    sessions.sort(
      (a, b) => b.last_event_timestamp.getTime() - a.last_event_timestamp.getTime()
    );

    return sessions;
  }

  /**
   * Associate pixel with user account
   */
  async associatePixelWithUser(
    pixelId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ pixel_id: pixelId })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to associate pixel: ${error.message}`);
    }
  }
}

export const pixelService = new PixelService();
