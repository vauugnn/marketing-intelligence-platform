const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Integrations
  async getIntegrations() {
    const res = await fetch(`${API_BASE_URL}/integrations`);
    return res.json();
  },

  async connectPlatform(platform: string) {
    const res = await fetch(`${API_BASE_URL}/integrations/${platform}/connect`, {
      method: 'POST'
    });
    return res.json();
  },

  async disconnectPlatform(platform: string) {
    const res = await fetch(`${API_BASE_URL}/integrations/${platform}`, {
      method: 'DELETE'
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
