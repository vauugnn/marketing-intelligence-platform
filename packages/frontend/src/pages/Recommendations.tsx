import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const result = await api.getRecommendations();
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalImpact = recommendations.reduce((sum, rec) => sum + rec.estimated_impact, 0);
  if (loading) {
    return <div>Loading recommendations...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">AI Recommendations</h2>
      <p className="text-gray-600 mb-8">Data-driven actions to improve your marketing ROI</p>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => {
          const colors = {
            scale: { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-700', icon: '✅' },
            optimize: { bg: 'bg-yellow-50', border: 'border-yellow-600', text: 'text-yellow-700', icon: '⚠️' },
            stop: { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700', icon: '🔴' }
          };
          const theme = colors[rec.type as keyof typeof colors] || colors.optimize;

          return (
            <div key={idx} className={`${theme.bg} border-l-4 ${theme.border} p-6 rounded`}>
              <div className="flex items-start">
                <span className="text-2xl mr-3">{theme.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg capitalize">{rec.type}: {rec.channel}</h3>
                  <p className="text-gray-700 mt-1">{rec.action}</p>
                  <p className="text-sm text-gray-600 mt-2">Reason: {rec.reason}</p>
                  <p className={`text-sm font-semibold ${theme.text} mt-2`}>
                    Estimated Impact: {rec.type === 'stop' ? 'Save' : '+'} ₱{rec.estimated_impact.toLocaleString()}/month ({rec.confidence}% confidence)
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-2">Total Potential Impact</h3>
        <p className="text-4xl font-bold text-green-600">+₱{totalImpact.toLocaleString()}/month</p>
        <p className="text-gray-600 mt-2">By implementing these recommendations</p>
      </div>
    </div>
  );
}
