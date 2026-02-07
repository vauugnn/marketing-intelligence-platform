import { useState } from 'react';

interface NetworkNode {
  id: string;
  name: string;
  revenue: number;
  x: number;
  y: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  strength: 'strong' | 'medium' | 'weak';
}

interface ChannelPerformance {
  channel: string;
  revenue: number;
  spend: number;
  roi: number;
  performance: string;
}

// Performance to color mapping
const performanceColors: { [key: string]: string } = {
  'Exceptional': '#10b981', // green
  'Excellent': '#3b82f6',   // blue
  'Satisfactory': '#f59e0b', // yellow/orange
  'Failing': '#ef4444'      // red
};

// Mock data
const mockChannels: ChannelPerformance[] = [
  { channel: 'Facebook', revenue: 245000, spend: 45000, roi: 5.44, performance: 'Excellent' },
  { channel: 'Instagram Bio', revenue: 189000, spend: 32000, roi: 5.91, performance: 'Excellent' },
  { channel: 'Google Ads', revenue: 312000, spend: 58000, roi: 5.38, performance: 'Exceptional' },
  { channel: 'LinkedIn', revenue: 156000, spend: 28000, roi: 5.57, performance: 'Failing' },
  { channel: 'X (Twitter)', revenue: 98000, spend: 22000, roi: 4.45, performance: 'Failing' },
];

export default function SystemMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Desktop positions (centered)
  const networkNodes: NetworkNode[] = [
    { id: 'facebook', name: 'Facebook Ads', revenue: 245000, x: 28, y: 42 },
    { id: 'instagram', name: 'Instagram', revenue: 189000, x: 50, y: 25 },
    { id: 'google', name: 'Google Ads', revenue: 312000, x: 72, y: 42 },
    { id: 'linkedin', name: 'LinkedIn', revenue: 156000, x: 58, y: 65 },
    { id: 'twitter', name: 'X (Twitter)', revenue: 98000, x: 20, y: 62 },
  ];

  const networkEdges: NetworkEdge[] = [
    { from: 'facebook', to: 'instagram', strength: 'strong' },
    { from: 'instagram', to: 'google', strength: 'strong' },
    { from: 'google', to: 'linkedin', strength: 'medium' },
  ];

  // Get color for each node based on channel performance
  const getNodeColor = (nodeId: string): string => {
    if (nodeId === 'tiktok' || nodeId === 'twitter' || nodeId === 'linkedin') {
      return '#ef4444'; // red
    }

    const channelMap: { [key: string]: string } = {
      'facebook': 'Facebook',
      'instagram': 'Instagram Bio',
      'google': 'Google Ads',
    };

    const channelName = channelMap[nodeId];
    const channel = mockChannels.find(ch => ch.channel === channelName || ch.channel.includes(channelName));
    
    if (channel) {
      return performanceColors[channel.performance] || '#64748b';
    }
    return '#64748b';
  };

  const maxRevenue = Math.max(...networkNodes.map(n => n.revenue));
  
  const getNodeSize = (revenue: number) => {
    const minSize = 80;
    const maxSize = 140;
    return minSize + (revenue / maxRevenue) * (maxSize - minSize);
  };

  const getEdgeStyle = (strength: string) => {
    switch (strength) {
      case 'strong':
        return { stroke: '#10b981', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.9 };
      case 'medium':
        return { stroke: '#f59e0b', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.8 };
      case 'weak':
        return { stroke: '#ef4444', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.7 };
      default:
        return { stroke: '#64748b', strokeWidth: 2, strokeDasharray: 'none', opacity: 0.3 };
    }
  };

  const getSocialIcon = (nodeId: string) => {
    const iconProps = { className: "w-6 h-6", fill: "white", viewBox: "0 0 24 24" };
    
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
            <path fill="white" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
        );
      case 'linkedin':
        return (
          <svg {...iconProps}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
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

  const getNodeDetails = (nodeId: string) => {
    const node = networkNodes.find(n => n.id === nodeId);
    const channelMap: { [key: string]: string } = {
      'facebook': 'Facebook',
      'instagram': 'Instagram Bio',
      'google': 'Google Ads',
      'linkedin': 'LinkedIn',
      'twitter': 'X (Twitter)',
    };

    const channelName = channelMap[nodeId];
    const channel = mockChannels.find(ch => ch.channel === channelName || ch.channel.includes(channelName));
    
    return { node, channel };
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Left side - Graph and Legend */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden flex flex-col">
          {/* Network Graph */}
          <div className="flex-1 grid-pattern relative">
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
                    stroke={style.stroke}
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
                const isSelected = selectedNode === node.id;
                const nodeColor = getNodeColor(node.id);
                
                return (
                  <g key={node.id}>
                    {/* Outer glow effect for hovered/selected node */}
                    {(isHovered || isSelected) && (
                      <circle
                        cx={`${node.x}%`}
                        cy={`${node.y}%`}
                        r={size / 2 + 15}
                        fill={nodeColor}
                        className="node-glow-hover"
                        style={{ opacity: 0.3 }}
                      />
                    )}
                    
                    {/* Glassmorphism background circle */}
                    <circle
                      cx={`${node.x}%`}
                      cy={`${node.y}%`}
                      r={size / 2}
                      fill={nodeColor}
                      fillOpacity="0.2"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? "3" : "2"}
                      className="glassmorphism-node"
                    />
                    
                    {/* Main colored circle */}
                    <circle
                      cx={`${node.x}%`}
                      cy={`${node.y}%`}
                      r={size / 2 - 2}
                      fill={nodeColor}
                      opacity="0.8"
                      className="node-circle cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                      style={{
                        filter: (isHovered || isSelected) ? 'brightness(1.2)' : 'brightness(1)',
                      }}
                    />
                    
                    {/* Social media icon in center */}
                    <foreignObject
                      x={`${node.x - 3}%`}
                      y={`${node.y - 3}%`}
                      width="6%"
                      height="6%"
                      className="pointer-events-none"
                    >
                      <div className="w-full h-full flex items-center justify-center text-white opacity-90">
                        {getSocialIcon(node.id)}
                      </div>
                    </foreignObject>
                    
                    {/* Node name */}
                    <text
                      x={`${node.x}%`}
                      y={`${node.y - (size / 2 / 4.5) - 6.5}%`}
                      textAnchor="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="700"
                      className="pointer-events-none"
                    >
                      {node.name}
                    </text>
                    
                    {/* Revenue label */}
                    <text
                      x={`${node.x}%`}
                      y={`${node.y - (size / 2 / 4.5) - 3.5}%`}
                      textAnchor="middle"
                      fill="rgba(255, 255, 255, 0.7)"
                      fontSize="12"
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
          </div>

          {/* Legend - Below graph */}
          <div className="border-t border-gray-800 p-6 bg-gray-900/50">
            <div className="mb-4">
              <h4 className="font-bold text-base mb-1 flex items-center text-blue-400">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Legend
              </h4>
              <p className="text-xs text-gray-500">Understand the connections</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start">
                <div className="w-12 h-1 bg-green-500 mr-3 mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Green solid</p>
                  <p className="text-gray-400 text-xs">Strong synergy</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-12 h-1 bg-yellow-500 mr-3 mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Yellow solid</p>
                  <p className="text-gray-400 text-xs">Some reinforcement</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-12 h-1 bg-red-500 mr-3 mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Red solid</p>
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

            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Click on nodes to see detailed information. Larger nodes indicate higher revenue.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Details Panel (appears when node is selected) */}
      {selectedNode && (
        <div className="w-96 p-4 pl-0">
          <div className="h-full bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-6">
              {/* Header with close button */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getNodeColor(selectedNode) }}
                  >
                    <div className="text-white">
                      {getSocialIcon(selectedNode)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {getNodeDetails(selectedNode).node?.name}
                    </h3>
                    <p className="text-sm text-gray-400">Platform Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-red-500/30 border border-gray-600 hover:border-red-500/50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Performance Metrics */}
              {getNodeDetails(selectedNode).channel ? (
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Revenue Generated</div>
                    <div className="text-2xl font-bold text-white">
                      ₱{(getNodeDetails(selectedNode).node?.revenue || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Ad Spend</div>
                      <div className="text-lg font-bold text-white">
                        ₱{(getNodeDetails(selectedNode).channel?.spend || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">ROI</div>
                      <div className="text-lg font-bold text-white">
                        {getNodeDetails(selectedNode).channel?.roi.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Performance Status</div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: performanceColors[getNodeDetails(selectedNode).channel?.performance || ''] }}
                      ></div>
                      <div className="text-base font-semibold text-white">
                        {getNodeDetails(selectedNode).channel?.performance}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-xs text-blue-200/80">
                      This platform is{' '}
                      {getNodeDetails(selectedNode).channel?.performance === 'Exceptional' || 
                       getNodeDetails(selectedNode).channel?.performance === 'Excellent' 
                        ? 'performing well' 
                        : 'underperforming'}{' '}
                      and generating{' '}
                      {((getNodeDetails(selectedNode).node?.revenue || 0) / networkNodes.reduce((sum, n) => sum + n.revenue, 0) * 100).toFixed(1)}%{' '}
                      of total revenue.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/50 rounded-lg p-6 text-center border border-gray-700">
                  <div className="text-gray-400 text-sm">
                    No detailed metrics available for this platform yet.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}