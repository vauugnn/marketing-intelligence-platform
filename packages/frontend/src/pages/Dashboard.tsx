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

  // Hardcoded system map data
  const networkNodes: NetworkNode[] = [
    { id: 'facebook', name: 'Facebook Ads', revenue: 245000, x: 30, y: 40, color: '#3b82f6' },
    { id: 'instagram', name: 'Instagram', revenue: 189000, x: 55, y: 25, color: '#ec4899' },
    { id: 'google', name: 'Google Ads', revenue: 312000, x: 70, y: 50, color: '#10b981' },
    { id: 'linkedin', name: 'LinkedIn', revenue: 156000, x: 45, y: 65, color: '#0ea5e9' },
    { id: 'tiktok', name: 'TikTok', revenue: 203000, x: 25, y: 70, color: '#a855f7' },
    { id: 'twitter', name: 'X (Twitter)', revenue: 98000, x: 15, y: 55, color: '#64748b' },
  ];

  const networkEdges: NetworkEdge[] = [
    { from: 'facebook', to: 'instagram', strength: 'strong' },
    { from: 'instagram', to: 'tiktok', strength: 'strong' },
    { from: 'google', to: 'facebook', strength: 'medium' },
    { from: 'google', to: 'linkedin', strength: 'medium' },
    { from: 'linkedin', to: 'twitter', strength: 'weak' },
    { from: 'tiktok', to: 'twitter', strength: 'weak' },
    { from: 'facebook', to: 'google', strength: 'medium' },
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
        return { strokeWidth: 3, strokeDasharray: 'none', opacity: 0.8 };
      case 'medium':
        return { strokeWidth: 2, strokeDasharray: 'none', opacity: 0.5 };
      case 'weak':
        return { strokeWidth: 1.5, strokeDasharray: '5,5', opacity: 0.3 };
      default:
        return { strokeWidth: 1, strokeDasharray: 'none', opacity: 0.3 };
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
        <div className="mb-6">
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

              <div className={`grid-pattern relative ${mapExpanded ? 'h-[calc(100%-140px)]' : 'h-56 sm:h-64'}`}>
                <svg className="w-full h-full">
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
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth={style.strokeWidth}
                        strokeDasharray={style.strokeDasharray}
                        opacity={style.opacity}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Draw nodes */}
                  {networkNodes.map((node) => {
                    const size = getNodeSize(node.revenue);
                    const isHovered = hoveredNode === node.id;
                    
                    return (
                      <g key={node.id}>
                        {/* Glow effect for hovered node */}
                        {isHovered && (
                          <circle
                            cx={`${node.x}%`}
                            cy={`${node.y}%`}
                            r={size / 2 + 8}
                            fill={node.color}
                            opacity="0.2"
                            className="node-pulse"
                          />
                        )}
                        
                        {/* Main node */}
                        <circle
                          cx={`${node.x}%`}
                          cy={`${node.y}%`}
                          r={size / 2}
                          fill={node.color}
                          opacity={isHovered ? "1" : "0.8"}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          style={{
                            filter: isHovered ? 'brightness(1.2)' : 'none',
                            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                            transformOrigin: `${node.x}% ${node.y}%`
                          }}
                        />
                        
                        {/* Node label */}
                        <text
                          x={`${node.x}%`}
                          y={`${node.y + (mapExpanded ? 7 : 10)}%`}
                          textAnchor="middle"
                          fill="white"
                          fontSize={mapExpanded ? "12" : "8"}
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {mapExpanded ? node.name : node.name.split(' ')[0]}
                        </text>
                        
                        {/* Revenue label when expanded */}
                        {mapExpanded && (
                          <text
                            x={`${node.x}%`}
                            y={`${node.y + 11}%`}
                            textAnchor="middle"
                            fill="rgba(255, 255, 255, 0.6)"
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                            className="pointer-events-none"
                          >
                            ₱{(node.revenue / 1000).toFixed(0)}K
                          </text>
                        )}
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

              {/* Legend - only visible when expanded */}
              {mapExpanded && (
                <div className="p-4 border-t border-gray-800">
                  <h4 className="font-bold text-sm mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Legend
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center">
                      <div className="w-6 h-0.5 bg-white opacity-80 mr-2"></div>
                      <span className="text-gray-300"><strong>Thick solid</strong> = Strong synergy</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-0.5 bg-white opacity-50 mr-2"></div>
                      <span className="text-gray-300"><strong>Medium</strong> = Some reinforcement</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-0.5 bg-white opacity-30 mr-2" style={{ backgroundImage: 'repeating-linear-gradient(to right, white 0, white 2px, transparent 2px, transparent 6px)' }}></div>
                      <span className="text-gray-300"><strong>Dashed</strong> = Weak connection</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex items-center mr-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-500 -ml-1.5"></div>
                      </div>
                      <span className="text-gray-300"><strong>Node size</strong> = Revenue volume</span>
                    </div>
                  </div>
                </div>
              )}
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