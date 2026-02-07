import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjnbrcipoulfwdvcohhp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the auth headers with the current Supabase session token.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export const api = {
  // Integrations
  async getIntegrations() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/integrations`, {
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  async connectPlatform(platform: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/integrations/${platform}/connect`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  async connectWithApiKey(platform: string, apiKey: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/integrations/${platform}/connect/apikey`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ apiKey }),
    });
    return res.json();
  },

  async disconnectPlatform(platform: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/integrations/${platform}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  // Sync
  async getSyncStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sync/status`, {
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  async triggerSync(platform: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sync/${platform}`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    return res.json();
  },

  // Analytics
  async getPerformance() {
    const res = await fetch(`${API_BASE_URL}/analytics/performance`);
    return res.json();
  },

  async getSynergies() {
    const res = await fetch(`${API_BASE_URL}/analytics/synergies`);
    return res.json();
  },

  async getRecommendations() {
    const res = await fetch(`${API_BASE_URL}/analytics/recommendations`);
    return res.json();
  },

  // Pixel
  async generatePixel() {
    const res = await fetch(`${API_BASE_URL}/pixel/generate`, {
      method: 'POST'
    });
    return res.json();
  }
};
