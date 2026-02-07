import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ChannelPerformance {
  channel: string;
  revenue: number;
  spend: number;
  roi: number;
  performance: string;
}

interface Node {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  revenue: number;
  color: string;
}

interface Edge {
  from: string;
  to: string;
  strength: 'strong' | 'medium' | 'weak';
}

export default function Dashboard() {
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [showSystemMap, setShowSystemMap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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

  // Generate nodes based on channel performance
  const generateNodes = (): Node[] => {
    if (channels.length === 0) return [];

    const maxRevenue = Math.max(...channels.map(ch => ch.revenue), 1);
    const colors = [
      '#6366f1', // indigo
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#f97316', // orange
      '#14b8a6', // teal
    ];

    return channels.map((channel, idx) => {
      const angle = (idx / channels.length) * 2 * Math.PI;
      const distance = 120;
      const baseRadius = 30;
      const radius = baseRadius + (channel.revenue / maxRevenue) * 40;

      return {
        id: channel.channel,
        x: 250 + Math.cos(angle) * distance,
        y: 200 + Math.sin(angle) * distance,
        radius,
        label: channel.channel,
        revenue: channel.revenue,
        color: colors[idx % colors.length],
      };
    });
  };

  // Generate edges based on channel relationships (simplified - you'd calculate this from real data)
  const generateEdges = (): Edge[] => {
    if (channels.length < 2) return [];

    const edges: Edge[] = [];
    
    // Example logic: channels with similar ROI work well together
    channels.forEach((ch1, i) => {
      channels.slice(i + 1).forEach(ch2 => {
        const roiDiff = Math.abs(ch1.roi - ch2.roi);
        
        if (roiDiff < 50) {
          edges.push({
            from: ch1.channel,
            to: ch2.channel,
            strength: 'strong'
          });
        } else if (roiDiff < 100) {
          edges.push({
            from: ch1.channel,
            to: ch2.channel,
            strength: 'medium'
          });
        } else if (Math.random() > 0.5) {
          edges.push({
            from: ch1.channel,
            to: ch2.channel,
            strength: 'weak'
          });
        }
      });
    });

    return edges;
  };

  const nodes = generateNodes();
  const edges = generateEdges();

  const getEdgeStyle = (strength: string) => {
    switch (strength) {
      case 'strong':
        return { strokeWidth: 3, strokeDasharray: 'none', opacity: 0.8 };
      case 'medium':
        return { strokeWidth: 2, strokeDasharray: 'none', opacity: 0.5 };
      case 'weak':
        return { strokeWidth: 1, strokeDasharray: '5,5', opacity: 0.3 };
      default:
        return { strokeWidth: 1, strokeDasharray: 'none', opacity: 0.3 };
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        
        * {
          font-family: 'Outfit', sans-serif;
        }
        
        .mono {
          font-family: 'Space Mono', monospace;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .dark-glass-card {
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .metric-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .metric-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .collapse-btn {
          transition: all 0.3s ease;
        }
        
        .collapse-btn:hover {
          transform: scale(1.05);
        }
        
        .node-circle {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        
        .node-circle:hover {
          filter: brightness(1.2);
        }
        
        .table-row {
          transition: all 0.2s ease;
        }
        
        .table-row:hover {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
          transform: translateX(4px);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .pulse-edge {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-purple-100 text-lg">
            Your marketing performance at a glance
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          <div className="glass-card metric-card rounded-3xl p-6 fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Revenue</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2 mono">₱{totalRevenue.toLocaleString()}</p>
            <div className="flex items-center text-sm">
              <span className="text-emerald-600 font-semibold flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                +23%
              </span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>

          <div className="glass-card metric-card rounded-3xl p-6 fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Spend</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2 mono">₱{totalSpend.toLocaleString()}</p>
            <div className="flex items-center text-sm">
              <span className="text-rose-600 font-semibold flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                </svg>
                +8%
              </span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>

          <div className="glass-card metric-card rounded-3xl p-6 fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Average ROI</h3>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2 mono">{avgROI.toFixed(0)}%</p>
            <div className="flex items-center text-sm">
              <span className="text-emerald-600 font-semibold flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                +12%
              </span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>
        </div>

        {/* System Map Section */}
        <div className="glass-card rounded-3xl p-6 mb-6 fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Channel Synergy Map</h3>
              <p className="text-gray-600 text-sm mt-1">Visualize how your marketing channels work together</p>
            </div>
            <button
              onClick={() => setShowSystemMap(!showSystemMap)}
              className="collapse-btn px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 flex items-center gap-2"
            >
              {showSystemMap ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Expand
                </>
              )}
            </button>
          </div>

          {showSystemMap && (
            <div className="relative">
              {channels.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-lg">Network visualization will appear here</p>
                  <p className="text-sm mt-2">Connect platforms and wait 30 days for journey data</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-2xl p-8 overflow-hidden">
                  <svg viewBox="0 0 500 400" className="w-full h-auto max-h-96">
                    {/* Draw edges first */}
                    {edges.map((edge, idx) => {
                      const fromNode = nodes.find(n => n.id === edge.from);
                      const toNode = nodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const style = getEdgeStyle(edge.strength);
                      const isConnected = selectedNode === edge.from || selectedNode === edge.to;

                      return (
                        <line
                          key={idx}
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={isConnected ? '#8b5cf6' : '#cbd5e1'}
                          strokeWidth={style.strokeWidth}
                          strokeDasharray={style.strokeDasharray}
                          opacity={isConnected ? 0.8 : style.opacity}
                          className={edge.strength === 'strong' ? 'pulse-edge' : ''}
                        />
                      );
                    })}

                    {/* Draw nodes */}
                    {nodes.map((node) => {
                      const isSelected = selectedNode === node.id;
                      const isHovered = hoveredNode === node.id;
                      const scale = isSelected || isHovered ? 1.15 : 1;

                      return (
                        <g key={node.id}>
                          {/* Node shadow */}
                          <circle
                            cx={node.x}
                            cy={node.y + 4}
                            r={node.radius * scale}
                            fill="rgba(0, 0, 0, 0.1)"
                            filter="blur(4px)"
                          />
                          
                          {/* Node circle */}
                          <circle
                            className="node-circle"
                            cx={node.x}
                            cy={node.y}
                            r={node.radius * scale}
                            fill={node.color}
                            stroke="white"
                            strokeWidth={isSelected || isHovered ? 4 : 3}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                          />

                          {/* Node label */}
                          <text
                            x={node.x}
                            y={node.y + node.radius * scale + 20}
                            textAnchor="middle"
                            className="text-sm font-semibold"
                            fill="#1f2937"
                            style={{ pointerEvents: 'none' }}
                          >
                            {node.label}
                          </text>

                          {/* Revenue label */}
                          {(isSelected || isHovered) && (
                            <text
                              x={node.x}
                              y={node.y + node.radius * scale + 36}
                              textAnchor="middle"
                              className="text-xs mono"
                              fill="#6b7280"
                              style={{ pointerEvents: 'none' }}
                            >
                              ₱{node.revenue.toLocaleString()}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Legend */}
                  <div className="mt-8 p-4 bg-white rounded-xl border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Legend
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-gray-800 rounded"></div>
                        <span className="text-gray-700"><strong>Thick solid lines</strong> = Work very well together</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-0.5 bg-gray-600 rounded"></div>
                        <span className="text-gray-700"><strong>Medium lines</strong> = Some reinforcement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-0.5 border-t-2 border-dashed border-gray-400"></div>
                        <span className="text-gray-700"><strong>Broken lines</strong> = Isolated, doesn't help others</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                          <div className="w-5 h-5 rounded-full bg-purple-500"></div>
                        </div>
                        <span className="text-gray-700"><strong>Bigger nodes</strong> = More revenue</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Channel Performance Table */}
        <div className="glass-card rounded-3xl p-6 fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Channel Performance</h3>
              <p className="text-gray-600 text-sm mt-1">Detailed breakdown of each marketing channel</p>
            </div>
            <button
              onClick={() => setShowTable(!showTable)}
              className="collapse-btn px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 flex items-center gap-2"
            >
              {showTable ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Expand
                </>
              )}
            </button>
          </div>

          {showTable && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 uppercase tracking-wider">Channel</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 uppercase tracking-wider">Spend</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 uppercase tracking-wider">ROI</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600 uppercase tracking-wider">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((channel, idx) => (
                        <tr 
                          key={idx} 
                          className="table-row border-b border-gray-100 cursor-pointer"
                          onClick={() => setSelectedNode(selectedNode === channel.channel ? null : channel.channel)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: nodes.find(n => n.id === channel.channel)?.color || '#6366f1' }}
                              ></div>
                              <span className="font-semibold text-gray-900">{channel.channel}</span>
                            </div>
                          </td>
                          <td className="text-right py-4 px-6 mono font-semibold text-gray-900">
                            ₱{channel.revenue.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-6 mono font-medium text-gray-600">
                            ₱{channel.spend.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-6 mono font-bold text-gray-900">
                            {channel.roi === null ? '∞' : `${channel.roi}%`}
                          </td>
                          <td className="text-center py-4 px-6">
                            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                              channel.performance === 'Exceptional' ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800' :
                              channel.performance === 'Excellent' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                              channel.performance === 'Satisfactory' ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800' :
                              'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800'
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}