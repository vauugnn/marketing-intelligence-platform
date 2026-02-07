import { useEffect, useState } from 'react';
import { api } from '../services/api';

const platformDetails: Record<string, { name: string; description: string }> = {
  google_analytics_4: { name: 'Google Analytics 4', description: 'Track website traffic and conversions' },
  meta: { name: 'Meta (Facebook/Instagram)', description: 'Connect your ad accounts' },
  google_ads: { name: 'Google Ads', description: 'Import ad performance data' },
  stripe: { name: 'Stripe', description: 'Pull payment transaction data' },
  paypal: { name: 'PayPal', description: 'Import payment history' },
  hubspot: { name: 'HubSpot', description: 'Connect your CRM data' },
  mailchimp: { name: 'Mailchimp', description: 'Track email campaigns' }
};

export default function Integrations() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixelData, setPixelData] = useState<any>(null);
  const [showPixelCode, setShowPixelCode] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadOrGeneratePixel();
  }, []);

  const loadIntegrations = async () => {
    try {
      const result = await api.getIntegrations();
      if (result.success) {
        setPlatforms(result.data);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrGeneratePixel = async () => {
    try {
      // In a real app, check if user already has a pixel first
      const result = await api.generatePixel();
      if (result.success) {
        setPixelData(result.data);
      }
    } catch (error) {
      console.error('Failed to generate pixel:', error);
    }
  };

  const handleConnect = async (platformId: string) => {
    try {
      const result = await api.connectPlatform(platformId);
      alert(result.message || 'OAuth flow will be implemented');
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Connection failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Integrations</h2>
      <p className="text-gray-600 mb-8">Connect your marketing tools to get started</p>

      {/* Tracking Pixel - Critical First Step */}
      <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-purple-900">📍 Your Tracking Pixel</h3>
            <p className="text-purple-700 mt-1">Install this on your website to track customer journeys</p>
          </div>
          <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
            Required
          </span>
        </div>

        {pixelData && (
          <div className="mt-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Your Pixel ID:</span>
                <code className="bg-purple-100 px-3 py-1 rounded text-purple-900 font-mono text-sm">
                  {pixelData.pixel_id}
                </code>
              </div>

              <button
                onClick={() => setShowPixelCode(!showPixelCode)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showPixelCode ? '▼ Hide' : '▶ Show'} installation code
              </button>

              {showPixelCode && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Step 1:</strong> Copy this code snippet
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                      <code>{pixelData.snippet}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(pixelData.snippet)}
                      className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Step 2:</strong> Paste this code in your website's <code className="bg-blue-100 px-2 py-1 rounded">&lt;head&gt;</code> section or use Google Tag Manager
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 This lightweight script (&lt;5KB) tracks page views, UTM parameters, and customer journeys
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Platform Integrations */}
      <h3 className="text-lg font-semibold mb-4">Marketing Platform Connections</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {platforms.map(platform => {
            const details = platformDetails[platform.platform] || { name: platform.platform, description: '' };
            const isConnected = platform.status === 'connected';

            return (
              <div key={platform.platform} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{details.name}</h3>
                      {isConnected && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{details.description}</p>
                  </div>
                  <button
                    onClick={() => handleConnect(platform.platform)}
                    className={`px-4 py-2 rounded font-medium ${
                      isConnected
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isConnected ? 'Reconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
