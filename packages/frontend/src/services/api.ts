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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
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
  pixel_id: string;
  snippet: string;
}

export function generatePixel(): Promise<PixelData> {
  return fetchApi('/pixel/generate', { method: 'POST' });
}
