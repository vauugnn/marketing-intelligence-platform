import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ChannelPerformance {
  channel: string;
  revenue: number;
  spend: number;
  roi: number;
  performance: string;
}

interface NetworkNode {
  id: string;
  name: string;
  revenue: number;
  x: number;
  y: number;
  color: string;
}

interface NetworkEdge {
  from: string;
  to: string;
  strength: 'strong' | 'medium' | 'weak';
}

export default function Dashboard() {
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Hardcoded system map data - repositioned to avoid overlap
  const networkNodes: NetworkNode[] = [
    { id: 'facebook', name: 'Facebook Ads', revenue: 245000, x: 25, y: 30, color: '#3b82f6' },
    { id: 'instagram', name: 'Instagram', revenue: 189000, x: 50, y: 15, color: '#ec4899' },
    { id: 'google', name: 'Google Ads', revenue: 312000, x: 75, y: 30, color: '#10b981' },
    { id: 'linkedin', name: 'LinkedIn', revenue: 156000, x: 60, y: 55, color: '#0ea5e9' },
    { id: 'tiktok', name: 'TikTok', revenue: 203000, x: 30, y: 70, color: '#a855f7' },
    { id: 'twitter', name: 'X (Twitter)', revenue: 98000, x: 15, y: 50, color: '#64748b' },
  ];

  const networkEdges: NetworkEdge[] = [
    { from: 'facebook', to: 'instagram', strength: 'strong' },
    { from: 'instagram', to: 'google', strength: 'strong' },
    { from: 'google', to: 'linkedin', strength: 'medium' },
    { from: 'linkedin', to: 'tiktok', strength: 'medium' },
    { from: 'tiktok', to: 'twitter', strength: 'weak' },
    { from: 'twitter', to: 'facebook', strength: 'weak' },
    { from: 'instagram', to: 'tiktok', strength: 'medium' },
  ];

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

  const maxRevenue = Math.max(...networkNodes.map(n => n.revenue));
  const getNodeSize = (revenue: number) => {
    const minSize = 40;
    const maxSize = 120;
    return minSize + (revenue / maxRevenue) * (maxSize - minSize);
  };

  const getEdgeStyle = (strength: string) => {
    switch (strength) {
      case 'strong':
        return { strokeWidth: 4, strokeDasharray: 'none', opacity: 0.9 };
      case 'medium':
        return { strokeWidth: 3, strokeDasharray: 'none', opacity: 0.6 };
      case 'weak':
        return { strokeWidth: 2, strokeDasharray: '8,8', opacity: 0.4 };
      default:
        return { strokeWidth: 2, strokeDasharray: 'none', opacity: 0.3 };
    }
  };

  const getSocialIcon = (nodeId: string) => {
    const iconProps = { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 24 24" };
    
    switch (nodeId) {
      case 'facebook':
        return (
          <svg {...iconProps}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg {...iconProps}>
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
          </svg>
        );
      case 'google':
        return (
          <svg {...iconProps} viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
        );
      case 'linkedin':
        return (
          <svg {...iconProps}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      case 'tiktok':
        return (
          <svg {...iconProps}>
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        );
      case 'twitter':
        return (
          <svg {...iconProps}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * {
          font-family: 'Outfit', sans-serif;
        }

        .metric-card {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .metric-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
        }

        .table-container {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .system-map-container {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.8) 0%, rgba(20, 20, 30, 0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .system-map-expanded {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90vw;
          height: 85vh;
          z-index: 50;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(255, 255, 255, 0.15);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 40;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .node-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 ml-14 lg:ml-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Performance Dashboard
          </h1>
          <p className="text-gray-400 text-sm">
            Real-time insights into your marketing channels
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="metric-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-xs font-medium tracking-wide uppercase">Total Revenue</h3>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1 font-mono">₱{totalRevenue.toLocaleString()}</p>
            <div className="flex items-center text-green-400 text-xs font-medium">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              23% from last month
            </div>
          </div>

          <div className="metric-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-xs font-medium tracking-wide uppercase">Total Spend</h3>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1 font-mono">₱{totalSpend.toLocaleString()}</p>
            <div className="flex items-center text-red-400 text-xs font-medium">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              8% from last month
            </div>
          </div>

          <div className="metric-card p-4 rounded-xl sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-xs font-medium tracking-wide uppercase">Average ROI</h3>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1 font-mono">{avgROI.toFixed(0)}%</p>
            <div className="flex items-center text-green-400 text-xs font-medium">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              12% from last month
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Channel Performance Table */}
          <div className="lg:col-span-2 table-container rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold">Channel Performance</h3>
              <p className="text-gray-400 text-xs mt-0.5">Track revenue, spend, and ROI across platforms</p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm mt-3">Loading performance data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-custom" style={{ maxHeight: '350px' }}>
                <table className="w-full">
                  <thead className="bg-gray-900/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Channel</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Spend</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ROI</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {channels.map((channel, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-sm">{channel.channel}</td>
                        <td className="text-right py-3 px-4 font-mono text-sm text-green-400">₱{channel.revenue.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono text-sm text-orange-400">₱{channel.spend.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono font-bold text-sm">
                          {channel.roi === null ? '∞' : `${channel.roi}%`}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            channel.performance === 'Exceptional' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            channel.performance === 'Excellent' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            channel.performance === 'Satisfactory' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
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

          {/* System Map Preview */}
          <div className="lg:col-span-1">
            <div 
              className={`system-map-container rounded-xl overflow-hidden ${mapExpanded ? 'system-map-expanded cursor-default' : 'cursor-pointer'}`}
              onClick={() => !mapExpanded && setMapExpanded(true)}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">System Map</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Platform relationships</p>
                </div>
                {mapExpanded && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMapExpanded(false);
                    }}
                    className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className={`${mapExpanded ? 'flex flex-col lg:flex-row h-[calc(100%-64px)]' : 'h-56 sm:h-64'}`}>
                {/* Network Graph */}
                <div className={`grid-pattern relative ${mapExpanded ? 'flex-1 min-h-0' : 'w-full h-full'}`}>
                  <svg className="w-full h-full" style={{ minHeight: mapExpanded ? '400px' : 'auto' }}>
                    {/* Draw edges */}
                    {networkEdges.map((edge, idx) => {
                      const fromNode = networkNodes.find(n => n.id === edge.from);
                      const toNode = networkNodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const style = getEdgeStyle(edge.strength);
                      return (
                        <line
                          key={idx}
                          x1={`${fromNode.x}%`}
                          y1={`${fromNode.y}%`}
                          x2={`${toNode.x}%`}
                          y2={`${toNode.y}%`}
                          stroke="white"
                          strokeWidth={style.strokeWidth}
                          strokeDasharray={style.strokeDasharray}
                          opacity={style.opacity}
                          className="transition-all duration-300"
                        />
                      );
                    })}

                    {/* Draw nodes */}
                    {networkNodes.map((node) => {
                      const baseSize = mapExpanded ? 80 : 50;
                      const size = baseSize + (node.revenue / maxRevenue) * (mapExpanded ? 60 : 30);
                      const isHovered = hoveredNode === node.id;
                      
                      return (
                        <g key={node.id}>
                          {/* Glow effect for hovered node */}
                          {isHovered && (
                            <circle
                              cx={`${node.x}%`}
                              cy={`${node.y}%`}
                              r={size / 2 + 12}
                              fill={node.color}
                              opacity="0.3"
                              className="node-pulse"
                            />
                          )}
                          
                          {/* Main node circle */}
                          <circle
                            cx={`${node.x}%`}
                            cy={`${node.y}%`}
                            r={size / 2}
                            fill={node.color}
                            opacity="1"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            style={{
                              filter: isHovered ? 'brightness(1.2)' : 'none'
                            }}
                          />
                          
                          {/* Social media icon in center */}
                          {mapExpanded && (
                            <foreignObject
                              x={`${node.x - 3}%`}
                              y={`${node.y - 3}%`}
                              width="6%"
                              height="6%"
                              className="pointer-events-none"
                            >
                              <div className="w-full h-full flex items-center justify-center text-white">
                                {getSocialIcon(node.id)}
                              </div>
                            </foreignObject>
                          )}
                          
                          {/* Node name - positioned above circle */}
                          <text
                            x={`${node.x}%`}
                            y={`${node.y - (size / 2 / (mapExpanded ? 8 : 12)) - 2}%`}
                            textAnchor="middle"
                            fill="white"
                            fontSize={mapExpanded ? "14" : "9"}
                            fontWeight="700"
                            className="pointer-events-none"
                          >
                            {node.name}
                          </text>
                          
                          {/* Revenue label - positioned below name, above circle */}
                          <text
                            x={`${node.x}%`}
                            y={`${node.y - (size / 2 / (mapExpanded ? 8 : 12)) + 1}%`}
                            textAnchor="middle"
                            fill="rgba(255, 255, 255, 0.7)"
                            fontSize={mapExpanded ? "12" : "8"}
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="500"
                            className="pointer-events-none"
                          >
                            ₱{(node.revenue / 1000).toFixed(0)}K
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {!mapExpanded && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-300 font-medium">Click to expand</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend - right side on desktop, bottom on mobile */}
                {mapExpanded && (
                  <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-800 p-6 flex flex-col">
                    <div className="mb-6">
                      <h4 className="font-bold text-base mb-1 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Legend
                      </h4>
                      <p className="text-xs text-gray-500">Understand the connections</p>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                      <div className="flex items-start">
                        <div className="w-12 h-1 bg-white opacity-90 mr-3 mt-2 flex-shrink-0 rounded"></div>
                        <div>
                          <p className="text-white font-semibold">Thick solid</p>
                          <p className="text-gray-400 text-xs">Strong synergy</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-0.5 bg-white opacity-60 mr-3 mt-2 flex-shrink-0 rounded"></div>
                        <div>
                          <p className="text-white font-semibold">Medium</p>
                          <p className="text-gray-400 text-xs">Some reinforcement</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-12 h-0.5 bg-white opacity-40 mr-3 mt-2 flex-shrink-0 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, white 0, white 4px, transparent 4px, transparent 12px)' }}></div>
                        <div>
                          <p className="text-white font-semibold">Dashed</p>
                          <p className="text-gray-400 text-xs">Weak connection</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center mr-3 mt-1 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                          <div className="w-5 h-5 rounded-full bg-blue-500 -ml-2"></div>
                        </div>
                        <div>
                          <p className="text-white font-semibold">Node size</p>
                          <p className="text-gray-400 text-xs">Revenue volume indicator</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-800">
                      <p className="text-xs text-gray-500">
                        Hover over nodes to see details. Larger nodes indicate higher revenue.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when map is expanded */}
      {mapExpanded && (
        <div className="overlay" onClick={() => setMapExpanded(false)}></div>
      )}
    </div>
  );
}