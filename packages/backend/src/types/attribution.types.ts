/**
 * TypeScript interfaces and types for the Attribution Service
 * Handles cross-referencing payment transactions with pixel events
 */

export interface TransactionData {
  transaction_id: string;
  email: string;
  amount: number;
  currency: string;
  timestamp: string; // ISO format
  platform: 'stripe' | 'paypal';
  metadata?: Record<string, any>;
}

export interface PixelEvent {
  id: string;
  pixel_id: string;
  session_id: string;
  user_id: string | null;
  event_type: 'page_view' | 'conversion' | 'custom';
  page_url: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  timestamp: string;
  user_agent: string | null;
  ip_address: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface PixelSession {
  session_id: string;
  pixel_id: string;
  events: PixelEvent[];
  first_event_timestamp: Date;
  last_event_timestamp: Date;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  has_conversion_event: boolean;
  event_count: number;
}

export interface AttributionMatch {
  // Pixel matching data
  pixelMatch: boolean;
  pixelSessionId?: string;
  pixelChannel?: string;
  pixelTimeProximity?: number; // 0-1, higher = closer in time
  pixelHasConversion?: boolean;
  pixelUtmCompleteness?: number; // 0-1, based on how many UTM params present

  // GA4 validation data
  ga4Match: boolean;
  ga4Channel?: string;
  ga4HasTraffic?: boolean;
  ga4ConversionCount?: number;

  // Additional metadata
  allCandidateSessions?: string[];
  conflictReason?: string;
}

export interface ConfidenceResult {
  score: number; // 0-100
  level: 'high' | 'medium' | 'low';
  method: 'dual_verified' | 'single_source' | 'uncertain';
}

export interface VerifiedConversion {
  id?: string;
  user_id: string | null;
  transaction_id: string;
  email: string | null;
  amount: number;
  currency: string;

  // Attribution sources
  pixel_session_id: string | null;
  ga4_session_id: string | null;
  attributed_channel: string | null;

  // Confidence scoring
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  attribution_method: 'dual_verified' | 'single_source' | 'uncertain';

  // Flags
  is_platform_over_attributed: boolean;
  conflicting_sources: string[] | null;

  timestamp: string;
  created_at?: string;
  metadata: Record<string, any> | null;
}

export interface GA4ValidationResult {
  hasTraffic: boolean;
  conversionCount: number;
  topChannels: string[];
}

export interface OverAttributionResult {
  isOverAttributed: boolean;
  details: {
    actualSales: number;
    platformClaimed: number;
    discrepancy: number;
  };
}

export interface AttributionStats {
  total_conversions: number;
  attributed_conversions: number;
  attribution_rate: number;
  avg_confidence_score: number;
  by_confidence_level: {
    high: number;
    medium: number;
    low: number;
  };
  by_attribution_method: {
    dual_verified: number;
    single_source: number;
    uncertain: number;
  };
  over_attributed_count: number;
}

export interface User {
  id: string;
  email: string;
  pixel_id: string | null;
  created_at: string;
  updated_at: string;
}
