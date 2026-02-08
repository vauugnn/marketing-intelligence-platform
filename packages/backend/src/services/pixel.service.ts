import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../config/supabase';
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

    // Merge visitor data and conversion data into metadata (legacy support)
    // but primarily store in dedicated columns

    // Parse metadata if it's a string
    let parsedMetadata: Record<string, any> = {};
    if (typeof event.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(event.metadata);
      } catch (e) {
        console.warn('Failed to parse metadata string:', e);
        parsedMetadata = { raw_metadata: event.metadata };
      }
    } else if (event.metadata) {
      parsedMetadata = event.metadata;
    }

    // Extract fields from metadata if not present at top level
    const visitor_id = event.visitor_id || parsedMetadata.visitor_id;
    const visitor_email = event.visitor_email || parsedMetadata.visitor_email || parsedMetadata.email; // Common email field
    const visitor_name = event.visitor_name || parsedMetadata.visitor_name || parsedMetadata.name; // Common name field
    const value = event.value ?? parsedMetadata.value;
    const currency = event.currency || parsedMetadata.currency;

    // Clean metadata (remove visitor fields from metadata to avoid duplication in jsonb if desired, 
    // but typically keeping them is fine. We will merge everything into metadata column for completeness)
    const metadata = {
      ...parsedMetadata,
      visitor_id,
      visitor_email,
      visitor_name,
      value,
      currency
    };

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

        // Store top-level columns from extracted data
        visitor_id: visitor_id || null,
        visitor_email: visitor_email || null,
        visitor_name: visitor_name || null,
        value: value ?? null,
        currency: currency || null,

        // Store all extra data in metadata column
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
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
   * Get recent pixel events for a user
   */
  async getRecentEvents(userId: string, limit: number = 50): Promise<any[]> {
    const pixelId = await this.getOrCreatePixel(userId);

    const { data, error } = await supabaseAdmin
      .from('pixel_events')
      .select('*')
      .eq('pixel_id', pixelId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent purchase events for a user
   */
  async getPurchaseEvents(userId: string, limit: number = 50): Promise<any[]> {
    const pixelId = await this.getOrCreatePixel(userId);

    const { data, error } = await supabaseAdmin
      .from('pixel_events')
      .select('*')
      .eq('pixel_id', pixelId)
      .eq('event_type', 'purchase')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch purchase events: ${error.message}`);
    }

    return data || [];
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
