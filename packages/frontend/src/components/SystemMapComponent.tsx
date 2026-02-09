import { useState, useEffect, useMemo } from 'react';
import type { ChannelPerformance, ChannelSynergy } from '@shared/types';
import { useSynergies } from '../hooks/useAnalytics';

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

interface SystemMapComponentProps {
  channels: ChannelPerformance[];
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

// Performance to color mapping — lowercase keys matching API values
const performanceColors: { [key: string]: string } = {
  'exceptional': '#10b981',
  'excellent': '#3b82f6',
  'satisfactory': '#f59e0b',
  'poor': '#f97316',
  'failing': '#ef4444'
};

// Fixed layout positions for known channel names
const CHANNEL_POSITIONS: Record<string, { desktop: { x: number; y: number }; mobile: { x: number; y: number } }> = {
  facebook: { desktop: { x: 28, y: 42 }, mobile: { x: 22, y: 42 } },
  google: { desktop: { x: 72, y: 42 }, mobile: { x: 78, y: 42 } },
  instagram: { desktop: { x: 50, y: 25 }, mobile: { x: 50, y: 20 } },
  email: { desktop: { x: 50, y: 65 }, mobile: { x: 50, y: 68 } },
  tiktok: { desktop: { x: 20, y: 62 }, mobile: { x: 18, y: 68 } },
  twitter: { desktop: { x: 20, y: 62 }, mobile: { x: 18, y: 68 } },
  linkedin: { desktop: { x: 58, y: 65 }, mobile: { x: 62, y: 68 } },
};

function circlePosition(index: number, total: number): { x: number; y: number } {
  const cx = 50, cy = 45;
  const radius = 28;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function channelToId(channel: string): string {
  return channel.toLowerCase().replace(/\s+/g, '_');
}

function capitalizeChannel(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function deriveNodes(channels: ChannelPerformance[], isMobile: boolean): NetworkNode[] {
  return channels.map((ch, i) => {
    const id = channelToId(ch.channel);
    const pos = CHANNEL_POSITIONS[id]
      ? (isMobile ? CHANNEL_POSITIONS[id].mobile : CHANNEL_POSITIONS[id].desktop)
      : circlePosition(i, channels.length);
    return { id, name: capitalizeChannel(ch.channel), revenue: ch.revenue, x: pos.x, y: pos.y };
  });
}

function deriveEdges(synergies: ChannelSynergy[]): NetworkEdge[] {
  return synergies.map((s) => ({
    from: channelToId(s.channel_a),
    to: channelToId(s.channel_b),
    strength: s.synergy_score >= 1.5 ? 'strong' : s.synergy_score >= 1.0 ? 'medium' : 'weak',
  }));
}

export default function SystemMapComponent({ channels, isExpanded, onToggleExpand }: SystemMapComponentProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { data: synergies = [] } = useSynergies();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const networkNodes = useMemo(() => deriveNodes(channels, isMobile), [channels, isMobile]);
  const networkEdges = useMemo(() => deriveEdges(synergies), [synergies]);

  const channelMap = useMemo(() => {
    const map = new Map<string, ChannelPerformance>();
    channels.forEach((ch) => map.set(channelToId(ch.channel), ch));
    return map;
  }, [channels]);

  const getNodeColor = (nodeId: string): string => {
    const ch = channelMap.get(nodeId);
    if (ch) return performanceColors[ch.performance_rating] || '#64748b';
    return '#64748b';
  };

  const maxRevenue = Math.max(...networkNodes.map(n => n.revenue), 1);

  const getNodeSize = (revenue: number, isExpanded: boolean, isMobile: boolean) => {
    if (isMobile) {
      const minSize = 60;
      const maxSize = 100;
      return minSize + (revenue / maxRevenue) * (maxSize - minSize);
    }
    const minSize = isExpanded ? 80 : 50;
    const maxSize = isExpanded ? 140 : 80;
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
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg {...iconProps}>
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
          </svg>
        );
      case 'google':
        return (
          <svg {...iconProps} viewBox="0 0 48 48">
            <path fill="white" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg {...iconProps}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg {...iconProps}>
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg {...iconProps}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'email':
        return (
          <svg {...iconProps}>
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" fill="white" opacity="0.3" />
          </svg>
        );
    }
  };

  if (channels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No channel data available yet.</p>
      </div>
    );
  }

  return (
    <div
      className={`system-map-container rounded-xl overflow-hidden ${isExpanded ? 'system-map-expanded cursor-default' : ''}`}
      style={{ height: isExpanded ? 'auto' : '450px' }}
    >
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">System Map</h3>
          <p className="text-gray-400 text-xs mt-0.5">Platform relationships</p>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <button
              onClick={() => onToggleExpand(true)}
              className="expand-button w-7 h-7 rounded-lg hover:bg-gray-700/30 flex items-center justify-center transition-colors text-gray-400"
              title="Expand system map"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(false);
              }}
              className="w-7 h-7 rounded-lg bg-gray-700/50 hover:bg-red-500/30 border border-gray-600 hover:border-red-500/50 flex items-center justify-center transition-colors text-gray-400 hover:text-red-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className={`${isExpanded ? 'flex flex-col lg:flex-row h-[calc(100%-64px)]' : 'h-[calc(100%-76px)]'}`}>
        {/* Network Graph */}
        <div className={`grid-pattern relative ${isExpanded ? 'flex-1 min-h-0' : 'w-full h-full'}`}>
          <svg className="w-full h-full" style={{ minHeight: isExpanded ? '400px' : 'auto' }}>
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
              const size = getNodeSize(node.revenue, isExpanded, isMobile);
              const isHovered = hoveredNode === node.id;
              const nodeColor = getNodeColor(node.id);

              return (
                <g key={node.id}>
                  {isHovered && (
                    <circle
                      cx={`${node.x}%`}
                      cy={`${node.y}%`}
                      r={size / 2 + 15}
                      fill={nodeColor}
                      className="node-glow-hover"
                    />
                  )}

                  <circle
                    cx={`${node.x}%`}
                    cy={`${node.y}%`}
                    r={size / 2}
                    fill={nodeColor}
                    fillOpacity="0.2"
                    stroke={nodeColor}
                    strokeWidth="2"
                    className="glassmorphism-node"
                  />

                  <circle
                    cx={`${node.x}%`}
                    cy={`${node.y}%`}
                    r={size / 2 - 2}
                    fill={nodeColor}
                    opacity="0.8"
                    className="node-circle"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
                      cursor: 'pointer'
                    }}
                  />

                  <foreignObject
                    x={`${node.x - (isExpanded && !isMobile ? 3 : 2)}%`}
                    y={`${node.y - (isExpanded && !isMobile ? 3 : 2)}%`}
                    width={isExpanded && !isMobile ? "6%" : "4%"}
                    height={isExpanded && !isMobile ? "6%" : "4%"}
                    className="pointer-events-none"
                  >
                    <div className="w-full h-full flex items-center justify-center text-white opacity-90">
                      {getSocialIcon(node.id)}
                    </div>
                  </foreignObject>

                  {isExpanded && (
                    <>
                      <text
                        x={`${node.x}%`}
                        y={`${node.y - (size / 2 / (isMobile ? 5.5 : 4.5)) - (isMobile ? 5 : 6.5)}%`}
                        textAnchor="middle"
                        fill="white"
                        fontSize={isMobile ? "11" : "14"}
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        {node.name}
                      </text>

                      <text
                        x={`${node.x}%`}
                        y={`${node.y - (size / 2 / (isMobile ? 5.5 : 4.5)) - (isMobile ? 2.5 : 3.5)}%`}
                        textAnchor="middle"
                        fill="rgba(255, 255, 255, 0.7)"
                        fontSize={isMobile ? "10" : "12"}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="500"
                        className="pointer-events-none"
                      >
                        ₱{(node.revenue / 1000).toFixed(0)}K
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        {isExpanded && (
          <div className="w-full lg:w-64 xl:w-72 border-t lg:border-t-0 lg:border-l border-gray-800 p-4 lg:p-6 flex flex-col overflow-y-auto">
            <div className="mb-4 lg:mb-6">
              <h4 className="font-bold text-sm lg:text-base mb-1 flex items-center">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Legend
              </h4>
              <p className="text-xs text-gray-500">Understand the connections</p>
            </div>

            <div className="space-y-3 lg:space-y-4 text-xs lg:text-sm">
              <div className="flex items-start">
                <div className="w-10 lg:w-12 h-1 bg-green-500 mr-2 lg:mr-3 mt-1.5 lg:mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Green solid</p>
                  <p className="text-gray-400 text-xs">Strong synergy</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 lg:w-12 h-1 bg-yellow-500 mr-2 lg:mr-3 mt-1.5 lg:mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Yellow solid</p>
                  <p className="text-gray-400 text-xs">Some reinforcement</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-10 lg:w-12 h-1 bg-red-500 mr-2 lg:mr-3 mt-1.5 lg:mt-2 flex-shrink-0 rounded"></div>
                <div>
                  <p className="text-white font-semibold">Red solid</p>
                  <p className="text-gray-400 text-xs">Weak connection</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center mr-2 lg:mr-3 mt-1 flex-shrink-0">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-500"></div>
                  <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-blue-500 -ml-2"></div>
                </div>
                <div>
                  <p className="text-white font-semibold">Node size</p>
                  <p className="text-gray-400 text-xs">Revenue volume indicator</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 lg:pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Hover over nodes to see details. Larger nodes indicate higher revenue.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}