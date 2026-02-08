import { useState, useEffect, useMemo } from 'react';
import { usePerformance, useSynergies } from '../hooks/useAnalytics';
import type { ChannelPerformance, ChannelSynergy } from '@shared/types';

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

interface NodeConnection {
  type: 'incoming' | 'outgoing';
  fromNode: string;
  toNode: string;
  strength: 'strong' | 'medium' | 'weak';
}

// Performance to color mapping — lowercase keys matching API values
const performanceColors: { [key: string]: string } = {
  'exceptional': '#10b981',
  'excellent': '#10b981',
  'satisfactory': '#f59e0b',
  'poor': '#f97316',
  'failing': '#ef4444',
};

const VISUAL_CONFIG = {
  NODE_MIN_SIZE: 180,
  NODE_MAX_SIZE: 240,
  ICON_SIZE: 7,
  LABEL_FONT_SIZE: 2.4,
  REVENUE_FONT_SIZE: 2.0,
  FLOAT_ANIMATION_DURATION: '6s',
  PULSE_SCALE: 1.15,
  MIN_DISTANCE_BETWEEN_NODES: 25,
};

// Fixed layout positions for common channel names
const CHANNEL_POSITIONS: Record<string, { desktop: { x: number; y: number }; mobile: { x: number; y: number } }> = {
  facebook: { desktop: { x: 2, y: 45 }, mobile: { x: 20, y: 45 } },
  google: { desktop: { x: 98, y: 45 }, mobile: { x: 80, y: 45 } },
  email: { desktop: { x: 50, y: 78 }, mobile: { x: 50, y: 72 } },
  instagram: { desktop: { x: 50, y: 30 }, mobile: { x: 50, y: 25 } },
  tiktok: { desktop: { x: 25, y: 20 }, mobile: { x: 25, y: 20 } },
};

// Fallback positions arranged in a circle when channel isn't in the lookup
function circlePosition(index: number, total: number, isMobile: boolean): { x: number; y: number } {
  const cx = 50, cy = 50;
  const radius = isMobile ? 28 : 38;
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
      : circlePosition(i, channels.length, isMobile);
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

export default function SystemMap() {
  const { data: performance = [], isLoading: loadingPerf, error: errorPerf, refetch: refetchPerf } = usePerformance();
  const { data: synergies = [], isLoading: loadingSyn, refetch: refetchSyn } = useSynergies();

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [animatedNodes, setAnimatedNodes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Derive graph data from store
  const networkNodes = useMemo(() => deriveNodes(performance, isMobile), [performance, isMobile]);
  const networkEdges = useMemo(() => deriveEdges(synergies), [synergies]);

  // Build a lookup from channel id → ChannelPerformance
  const channelMap = useMemo(() => {
    const map = new Map<string, ChannelPerformance>();
    performance.forEach((ch: ChannelPerformance) => map.set(channelToId(ch.channel), ch));
    return map;
  }, [performance]);

  // Build a lookup from synergy pair → ChannelSynergy
  const synergyMap = useMemo(() => {
    const map = new Map<string, ChannelSynergy>();
    synergies.forEach((s: ChannelSynergy) => {
      const key = `${channelToId(s.channel_a)}-${channelToId(s.channel_b)}`;
      map.set(key, s);
      map.set(`${channelToId(s.channel_b)}-${channelToId(s.channel_a)}`, s);
    });
    return map;
  }, [synergies]);

  // Animate nodes on mount
  useEffect(() => {
    const nodeIds = networkNodes.map((n) => n.id);
    nodeIds.forEach((nodeId, index) => {
      setTimeout(() => {
        setAnimatedNodes((prev) => new Set(prev).add(nodeId));
      }, index * 200);
    });
  }, [networkNodes]);

  const loading = loadingPerf || loadingSyn;

  const getNodeColor = (nodeId: string): string => {
    const ch = channelMap.get(nodeId);
    if (ch) return performanceColors[ch.performance_rating] || '#64748b';
    return '#64748b';
  };

  const sortedByRevenue = [...networkNodes].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = sortedByRevenue[0]?.revenue || 1;
  const minRevenue = sortedByRevenue[sortedByRevenue.length - 1]?.revenue || 0;

  const getNodeSize = (revenue: number) => {
    const range = maxRevenue - minRevenue;
    const normalized = range > 0 ? (revenue - minRevenue) / range : 0.5;
    return VISUAL_CONFIG.NODE_MIN_SIZE + (normalized * (VISUAL_CONFIG.NODE_MAX_SIZE - VISUAL_CONFIG.NODE_MIN_SIZE));
  };

  const checkNodeOverlap = (node1: NetworkNode, node2: NetworkNode): boolean => {
    const size1 = getNodeSize(node1.revenue) / 15;
    const size2 = getNodeSize(node2.revenue) / 15;
    const distance = Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));
    const minDistance = (size1 + size2) / 2 + VISUAL_CONFIG.MIN_DISTANCE_BETWEEN_NODES / 15;
    return distance < minDistance;
  };

  const getEdgeStyle = (strength: string) => {
    switch (strength) {
      case 'strong': return { stroke: '#10b981', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.9 };
      case 'medium': return { stroke: '#f59e0b', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.8 };
      case 'weak': return { stroke: '#ef4444', strokeWidth: 4, strokeDasharray: 'none', opacity: 0.7 };
      default: return { stroke: '#64748b', strokeWidth: 2, strokeDasharray: 'none', opacity: 0.3 };
    }
  };

  const getSocialIcon = (nodeId: string) => {
    const iconProps = { className: "w-full h-full", fill: "white", viewBox: "0 0 24 24" };
    switch (nodeId) {
      case 'facebook':
        return <svg {...iconProps}><path d="M24 12.073c0-6.667-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
      case 'instagram':
        return <svg {...iconProps}><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>;
      case 'google':
        return <svg {...iconProps} viewBox="0 0 48 48"><path fill="white" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" /></svg>;
      case 'email':
        return <svg {...iconProps}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>;
      case 'tiktok':
        return <svg {...iconProps}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
      default:
        return <svg {...iconProps}><circle cx="12" cy="12" r="10" fill="white" opacity="0.3" /></svg>;
    }
  };

  const getNodeDetails = (nodeId: string) => {
    const node = networkNodes.find((n) => n.id === nodeId);
    const channel = channelMap.get(nodeId);
    return { node, channel };
  };

  const getNodeConnections = (nodeId: string): NodeConnection[] => {
    const connections: NodeConnection[] = [];
    networkEdges.forEach((edge) => {
      if (edge.from === nodeId) connections.push({ type: 'outgoing', fromNode: edge.from, toNode: edge.to, strength: edge.strength });
      if (edge.to === nodeId) connections.push({ type: 'incoming', fromNode: edge.from, toNode: edge.to, strength: edge.strength });
    });
    return connections;
  };

  const getNodeNameById = (nodeId: string): string => networkNodes.find((n) => n.id === nodeId)?.name || nodeId;

  const getStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'strong': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getConnectionMetrics = (fromNode: string, toNode: string) => {
    const syn = synergyMap.get(`${fromNode}-${toNode}`);
    if (syn) return { score: syn.synergy_score.toFixed(2), frequency: syn.frequency, confidence: syn.confidence };
    return { score: '—', frequency: 0, confidence: 0 };
  };

  // Loading state
  if (loading && performance.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-[3px] border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm mt-3">Loading system map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorPerf && performance.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">{errorPerf.message}</p>
          <button
            onClick={() => { refetchPerf(); refetchSyn(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (performance.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No channel data available yet.</p>
          <p className="text-gray-600 text-xs mt-1">Connect platforms and seed data to see your system map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
      {/* Header */}
      <div className="p-4 md:p-8 z-10">
        <div className="mb-3 lg:mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            System Map
          </h1>
          <p className="text-muted-foreground text-sm">
            Real-time insights into your marketing channels
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-0">
        {/* Graph and Legend */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 pb-4 lg:pt-0 overflow-hidden">
          <div className="flex-1 bg-card/40 backdrop-blur-sm border border-border rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm">
            <div
              className="flex-1 relative overflow-hidden"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var( --muted-foreground) / 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px',
                backgroundPosition: 'center center',
              }}
            >
              <svg className="w-full h-full animate-float" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {/* Edges */}
                {networkEdges.map((edge, idx) => {
                  const fromNode = networkNodes.find((n) => n.id === edge.from);
                  const toNode = networkNodes.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const style = getEdgeStyle(edge.strength);
                  const isConnectedToSelected = selectedNode === edge.from || selectedNode === edge.to;

                  const fromSize = getNodeSize(fromNode.revenue) / 15;
                  const toSize = getNodeSize(toNode.revenue) / 15;
                  const dx = toNode.x - fromNode.x;
                  const dy = toNode.y - fromNode.y;
                  const angle = Math.atan2(dy, dx);
                  const hasOverlap = checkNodeOverlap(fromNode, toNode);
                  const padding = hasOverlap ? 0.5 : 0.3;
                  const x1 = fromNode.x + Math.cos(angle) * (fromSize + padding);
                  const y1 = fromNode.y + Math.sin(angle) * (fromSize + padding);
                  const x2 = toNode.x - Math.cos(angle) * (toSize + padding);
                  const y2 = toNode.y - Math.sin(angle) * (toSize + padding);

                  return (
                    <g key={idx}>
                      <defs>
                        <marker id={`arrow-${idx}`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L0,4 L4,2 z" fill={style.stroke} />
                        </marker>
                      </defs>
                      <line x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={style.stroke} strokeWidth={isConnectedToSelected ? 0.6 : 0.4}
                        opacity={isConnectedToSelected ? 1 : style.opacity}
                        markerEnd={`url(#arrow-${idx})`} className="transition-all duration-500"
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {networkNodes.map((node) => {
                  const baseSize = getNodeSize(node.revenue);
                  const size = baseSize / 15;
                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedNode === node.id;
                  const nodeColor = getNodeColor(node.id);
                  const isAnimated = animatedNodes.has(node.id);

                  return (
                    <g key={node.id} style={{
                      opacity: isAnimated ? 1 : 0, transform: isAnimated ? 'scale(1)' : 'scale(0)',
                      transformOrigin: `${node.x}px ${node.y}px`, transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                      {(isHovered || isSelected) && (
                        <>
                          <circle cx={node.x} cy={node.y} r={size * VISUAL_CONFIG.PULSE_SCALE + 2} fill={nodeColor} opacity="0.2" className="animate-pulse-strong" />
                          <circle cx={node.x} cy={node.y} r={size * VISUAL_CONFIG.PULSE_SCALE + 1} fill={nodeColor} opacity="0.35" className="animate-pulse-strong" style={{ animationDelay: '0.2s' }} />
                          <circle cx={node.x} cy={node.y} r={size * 1.08} fill={nodeColor} opacity="0.5" className="animate-pulse-strong" style={{ animationDelay: '0.4s' }} />
                        </>
                      )}
                      <circle cx={node.x} cy={node.y} r={size + 0.3} fill="none" stroke={nodeColor}
                        strokeWidth={isSelected ? '0.3' : '0.15'} opacity={isSelected ? 0.8 : 0.4} className="transition-all duration-300"
                      />
                      <circle cx={node.x} cy={node.y} r={size} fill={nodeColor} fillOpacity="0.15"
                        stroke={nodeColor} strokeWidth={isSelected ? '0.25' : '0.15'} className="backdrop-blur-sm transition-all duration-300"
                      />
                      <circle cx={node.x} cy={node.y} r={(size - 0.3) * (isHovered || isSelected ? 1.08 : 1)}
                        fill={nodeColor} opacity="0.95"
                        className="cursor-pointer transition-all duration-500 ease-out hover:opacity-100"
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                        style={{ filter: (isHovered || isSelected) ? 'brightness(1.3) drop-shadow(0 0 8px currentColor)' : 'brightness(1)', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      />
                      <foreignObject x={node.x - VISUAL_CONFIG.ICON_SIZE / 2} y={node.y - VISUAL_CONFIG.ICON_SIZE / 2}
                        width={VISUAL_CONFIG.ICON_SIZE} height={VISUAL_CONFIG.ICON_SIZE} className="pointer-events-none"
                      >
                        <div className="w-full h-full flex items-center justify-center text-white opacity-95">
                          {getSocialIcon(node.id)}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className={`border-t border-border p-3 sm:p-6 bg-card/95 ${selectedNode ? 'hidden lg:block' : 'block'}`}>
              <div className="mb-3 sm:mb-4">
                <h4 className="font-bold text-sm sm:text-base mb-1 flex items-center text-primary">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Legend
                </h4>
                <p className="text-xs text-muted-foreground">Understand the connections</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-green-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div><p className="text-foreground font-semibold">Green solid</p><p className="text-muted-foreground text-xs">Strong synergy (score &ge; 1.5)</p></div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-yellow-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div><p className="text-foreground font-semibold">Yellow solid</p><p className="text-muted-foreground text-xs">Some reinforcement (score &ge; 1.0)</p></div>
                </div>
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-red-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div><p className="text-foreground font-semibold">Red solid</p><p className="text-muted-foreground text-xs">Weak connection</p></div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center mr-2 sm:mr-3 mt-1 flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500"></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 -ml-2 sm:-ml-3"></div>
                  </div>
                  <div><p className="text-foreground font-semibold">Node size</p><p className="text-muted-foreground text-xs">Revenue volume indicator</p></div>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Click on nodes to see detailed information and relationships.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="lg:w-96 px-4 sm:px-6 pb-4 lg:pl-0 animate-slide-in lg:overflow-auto z-20">
            <div className="h-full bg-card/90 backdrop-blur-md border border-border rounded-xl overflow-auto max-h-[60vh] lg:max-h-none shadow-xl">
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: getNodeColor(selectedNode) }}>
                      <div className="text-white">{getSocialIcon(selectedNode)}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-xl text-foreground">{getNodeDetails(selectedNode).node?.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Platform Details</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted hover:bg-destructive/10 border border-border hover:border-destructive/30 flex items-center justify-center transition-all text-muted-foreground hover:text-destructive"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Metrics */}
                {getNodeDetails(selectedNode).channel ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-primary/5 rounded-lg p-3 sm:p-4 border border-primary/10 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-1">Revenue Generated</div>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground">
                        ₱{(getNodeDetails(selectedNode).node?.revenue || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Ad Spend</div>
                        <div className="text-base sm:text-lg font-bold text-foreground">
                          ₱{(getNodeDetails(selectedNode).channel?.spend || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">ROI</div>
                        <div className="text-base sm:text-lg font-bold text-foreground">
                          {Math.round(getNodeDetails(selectedNode).channel?.roi || 0)}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <div className="text-xs text-muted-foreground mb-2">Performance Status</div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: performanceColors[getNodeDetails(selectedNode).channel?.performance_rating || ''] }}
                        ></div>
                        <div className="text-sm sm:text-base font-semibold text-foreground capitalize">
                          {getNodeDetails(selectedNode).channel?.performance_rating}
                        </div>
                      </div>
                    </div>

                    {/* Connections */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                      <div className="text-xs text-muted-foreground mb-3 font-semibold flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Platform Connections
                      </div>
                      <div className="space-y-3">
                        {getNodeConnections(selectedNode).map((conn, idx) => {
                          const metrics = getConnectionMetrics(conn.fromNode, conn.toNode);
                          return (
                            <div key={idx} className="bg-card/50 p-3 rounded border border-border shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1 flex-1 text-xs sm:text-sm">
                                  <span className="text-foreground/90 font-medium truncate">{getNodeNameById(conn.fromNode)}</span>
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  <span className="text-foreground/90 font-medium truncate">{getNodeNameById(conn.toNode)}</span>
                                </div>
                                <div className="px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2"
                                  style={{ backgroundColor: `${getStrengthColor(conn.strength)}20`, color: getStrengthColor(conn.strength) }}
                                >
                                  {conn.strength}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Synergy</div>
                                  <div className="text-sm font-bold text-foreground">{metrics.score}x</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Frequency</div>
                                  <div className="text-sm font-bold text-blue-500">{metrics.frequency}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Confidence</div>
                                  <div className="text-sm font-bold text-green-500">{metrics.confidence}%</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {getNodeConnections(selectedNode).length === 0 && (
                          <p className="text-xs text-muted-foreground">No synergy connections found for this channel.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-primary/80">
                        This platform is{' '}
                        {getNodeDetails(selectedNode).channel?.performance_rating === 'exceptional' || getNodeDetails(selectedNode).channel?.performance_rating === 'excellent'
                          ? 'performing well' : getNodeDetails(selectedNode).channel?.performance_rating === 'satisfactory' ? 'performing adequately' : 'underperforming'}{' '}
                        and generating{' '}
                        {((getNodeDetails(selectedNode).node?.revenue || 0) / networkNodes.reduce((sum, n) => sum + n.revenue, 0) * 100).toFixed(1)}%{' '}
                        of total revenue.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-6 text-center border border-border">
                    <div className="text-muted-foreground text-sm">No detailed metrics available for this platform yet.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float ${VISUAL_CONFIG.FLOAT_ANIMATION_DURATION} ease-in-out infinite; }
        @keyframes pulse-strong {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
