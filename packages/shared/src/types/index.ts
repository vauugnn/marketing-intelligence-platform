// Platform Types
export type Platform =
  | 'google_analytics_4'
  | 'meta'
  | 'google_ads'
  | 'stripe'
  | 'paypal'
  | 'hubspot'
  | 'mailchimp'
  | 'pixel';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'syncing';

// User & Account
export interface User {
  id: string;
  email: string;
  created_at: string;
  pixel_id?: string;
}

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: Platform;
  status: ConnectionStatus;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  platform_account_id?: string;
  metadata?: Record<string, any>;
  connected_at: string;
  last_synced_at?: string;
  sync_progress?: number | null;
}

// Raw Events (from platforms)
export interface RawEvent {
  id: string;
  user_id: string;
  platform: Platform;
  event_type: string;
  event_data: Record<string, any>;
  timestamp: string;
  created_at: string;
}

// Pixel Events
export interface PixelEvent {
  id: string;
  pixel_id: string;
  session_id: string;
  user_id?: string;
  event_type: 'page_view' | 'conversion' | 'custom';
  page_url: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

// Attribution & Conversions
export type AttributionConfidence = 'high' | 'medium' | 'low';

export interface VerifiedConversion {
  id: string;
  user_id: string;
  transaction_id: string;
  email?: string;
  amount: number;
  currency: string;

  // Attribution sources
  pixel_session_id?: string;
  ga4_session_id?: string;
  attributed_channel?: string;

  // Confidence scoring
  confidence_score: number; // 0-100
  confidence_level: AttributionConfidence;
  attribution_method: 'dual_verified' | 'single_source' | 'uncertain';

  // Flags
  is_platform_over_attributed: boolean;
  conflicting_sources?: string[];

  timestamp: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Channel Performance
export interface ChannelPerformance {
  channel: string;
  revenue: number;
  spend: number;
  roi: number;
  conversions: number;
  performance_rating: 'exceptional' | 'excellent' | 'satisfactory' | 'poor' | 'failing';
}

// System Intelligence
export interface ChannelSynergy {
  channel_a: string;
  channel_b: string;
  synergy_score: number; // multiplier effect
  frequency: number; // how often they appear together
  confidence: number;
}

export interface SystemHealth {
  overall_score: number; // 0-100
  synergies: ChannelSynergy[];
  isolated_channels: string[];
  recommendations: AIRecommendation[];
}

export interface AIRecommendation {
  id: string;
  type: 'scale' | 'optimize' | 'stop';
  channel: string;
  action: string;
  reason: string;
  estimated_impact: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

// Journey & Synergy Analysis Types
export interface Touchpoint {
  session_id: string;
  channel: string;
  timestamp: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  event_count: number;
}

export interface ConversionJourney {
  conversion_id: string;
  amount: number;
  channel_sequence: string[];
  touchpoints: Touchpoint[];
  is_multi_touch: boolean;
}

export interface JourneyPattern {
  pattern: string[];
  frequency: number;
  total_revenue: number;
  avg_revenue: number;
}

export interface ChannelRole {
  channel: string;
  primary_role: 'introducer' | 'closer' | 'supporter' | 'isolated';
  solo_conversions: number;
  assisted_conversions: number;
  introducer_count: number;
  closer_count: number;
  supporter_count: number;
}

export interface DateRange {
  start: string;
  end: string;
}

// OAuth Connect Response
export interface ConnectResponse {
  type: 'oauth' | 'api_key';
  authUrl?: string;
  message?: string;
}

// Sync Status
export interface SyncStatus {
  platform: Platform;
  status: ConnectionStatus;
  lastSyncedAt?: string;
  connectedAt?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
