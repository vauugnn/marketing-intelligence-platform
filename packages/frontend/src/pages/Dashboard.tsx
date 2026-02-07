import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ChannelPerformance {
  channel: string;
  revenue: number;
  spend: number;
  roi: number;
  performance: string;
}

export default function Dashboard() {
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      const result = await api.getPerformance();
      if (result.success) {
        setChannels(result.data);
      }
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
  const totalSpend = channels.reduce((sum, ch) => sum + ch.spend, 0);
  const avgROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">₱{totalRevenue.toLocaleString()}</p>
          <p className="text-green-600 text-sm mt-1">↑ 23% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Spend</h3>
          <p className="text-3xl font-bold mt-2">₱{totalSpend.toLocaleString()}</p>
          <p className="text-red-600 text-sm mt-1">↑ 8% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Average ROI</h3>
          <p className="text-3xl font-bold mt-2">{avgROI.toFixed(0)}%</p>
          <p className="text-green-600 text-sm mt-1">↑ 12% from last month</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Channel Performance</h3>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">Channel</th>
                  <th className="text-right py-3 px-4">Revenue</th>
                  <th className="text-right py-3 px-4">Spend</th>
                  <th className="text-right py-3 px-4">ROI</th>
                  <th className="text-center py-3 px-4">Performance</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{channel.channel}</td>
                    <td className="text-right py-3 px-4">₱{channel.revenue.toLocaleString()}</td>
                    <td className="text-right py-3 px-4">₱{channel.spend.toLocaleString()}</td>
                    <td className="text-right py-3 px-4">
                      {channel.roi === null ? '∞' : `${channel.roi}%`}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        channel.performance === 'Exceptional' ? 'bg-green-100 text-green-800' :
                        channel.performance === 'Excellent' ? 'bg-blue-100 text-blue-800' :
                        channel.performance === 'Satisfactory' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {channel.performance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
