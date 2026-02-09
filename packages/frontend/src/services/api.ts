import type {
  ChannelPerformance,
  ChannelSynergy,
  ChannelInsight,
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

export interface DateParams {
  startDate?: string;
  endDate?: string;
}

function buildDateQuery(params?: DateParams): string {
  if (!params?.startDate && !params?.endDate) return '';
  const parts: string[] = [];
  if (params.startDate) parts.push(`startDate=${params.startDate}`);
  if (params.endDate) parts.push(`endDate=${params.endDate}`);
  return `?${parts.join('&')}`;
}

export function getPerformance(params?: DateParams): Promise<ChannelPerformance[]> {
  return fetchApi(`/analytics/performance${buildDateQuery(params)}`);
}

export function getSynergies(params?: DateParams): Promise<ChannelSynergy[]> {
  return fetchApi(`/analytics/synergies${buildDateQuery(params)}`);
}

export function getChannelInsights(params?: DateParams): Promise<ChannelInsight[]> {
  return fetchApi(`/analytics/recommendations${buildDateQuery(params)}`);
}

export function getJourneyPatterns(params?: DateParams): Promise<JourneyPattern[]> {
  return fetchApi(`/analytics/journeys${buildDateQuery(params)}`);
}

export function getChannelRoles(params?: DateParams): Promise<ChannelRole[]> {
  return fetchApi(`/analytics/channel-roles${buildDateQuery(params)}`);
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
