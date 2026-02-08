import type {
  ChannelPerformance,
  ChannelSynergy,
  AIRecommendation,
  JourneyPattern,
  ChannelRole,
  PlatformConnection,
  SyncStatus,
  ConnectResponse,
} from '@shared/types';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || json.message || 'Request failed');
  return json.data;
}

// --- Integrations ---

export function getIntegrations(): Promise<PlatformConnection[]> {
  return fetchApi('/integrations');
}

export function connectPlatform(platform: string): Promise<ConnectResponse> {
  return fetchApi(`/integrations/${platform}/connect`, { method: 'POST' });
}

export function disconnectPlatform(platform: string): Promise<PlatformConnection> {
  return fetchApi(`/integrations/${platform}`, { method: 'DELETE' });
}

// --- Analytics ---

export function getPerformance(): Promise<ChannelPerformance[]> {
  return fetchApi('/analytics/performance');
}

export function getSynergies(): Promise<ChannelSynergy[]> {
  return fetchApi('/analytics/synergies');
}

export function getRecommendations(): Promise<AIRecommendation[]> {
  return fetchApi('/analytics/recommendations');
}

export function getJourneyPatterns(): Promise<JourneyPattern[]> {
  return fetchApi('/analytics/journeys');
}

export function getChannelRoles(): Promise<ChannelRole[]> {
  return fetchApi('/analytics/channel-roles');
}

// --- Sync ---

export function getSyncStatus(): Promise<SyncStatus[]> {
  return fetchApi('/sync/status');
}

export function triggerSync(platform: string): Promise<{ message: string }> {
  return fetchApi(`/sync/${platform}`, { method: 'POST' });
}

// --- Pixel ---

export interface PixelData {
  [x: string]: any;
  pixel_id: string;
  snippet: string;
}

export function generatePixel(): Promise<PixelData> {
  return fetchApi('/pixel/generate', { method: 'POST' });
}

// --- Pixel Events ---

export interface PixelEvent {
  id: string;
  pixel_id: string;
  session_id: string;
  event_type: string;
  page_url: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  visitor_id?: string;
  visitor_email?: string;
  visitor_name?: string;
  value?: number;
  currency?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function getPixelEvents(limit?: number): Promise<PixelEvent[]> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchApi(`/pixel/events${query}`);
}

export function getPurchaseEvents(limit?: number): Promise<PixelEvent[]> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchApi(`/pixel/purchases${query}`);
}

export function trackPixelEvent(data: Partial<PixelEvent> & { pixel_id: string }): Promise<{ event_id: string }> {
  return fetchApi('/pixel/track', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
