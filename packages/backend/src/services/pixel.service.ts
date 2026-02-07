import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { PixelEventInput } from '../validators/pixel.validator';

export class PixelService {
  /**
   * Generate a dedup key from event fields to prevent duplicate events
   */
  private generateDedupKey(event: PixelEventInput): string {
    const raw = `${event.pixel_id}|${event.session_id}|${event.event_type}|${event.page_url}|${event.timestamp}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
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

    const { data, error } = await supabase
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
      }, { onConflict: 'dedup_key' })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store pixel event: ${error.message}`);
    }

    return { id: data.id };
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
