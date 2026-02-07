import { useState, useEffect } from 'react';

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

interface NodeConnection {
  type: 'incoming' | 'outgoing';
  fromNode: string;
  toNode: string;
  strength: 'strong' | 'medium' | 'weak';
}

// Performance to color mapping - Maps performance status to circle colors
// Backend: Modify these colors to match your design system
const performanceColors: { [key: string]: string } = {
  'Exceptional': '#10b981', // Green - Best performance
  'Excellent': '#10b981',   // Green - Good performance
  'Satisfactory': '#f59e0b', // Yellow - Moderate performance
  'Failing': '#ef4444'      // Red - Poor performance
};

// Visual configuration constants
// Backend: Adjust these values to control node appearance
const VISUAL_CONFIG = {
  // Node sizing (in pixels for SVG viewBox scale)
  NODE_MIN_SIZE: 180,        // Minimum circle diameter
  NODE_MAX_SIZE: 240,        // Maximum circle diameter

  // Icon and label sizing
  ICON_SIZE: 7,              // Icon container size (larger = more visible)
  LABEL_FONT_SIZE: 2.4,      // Node name font size
  REVENUE_FONT_SIZE: 2.0,    // Revenue label font size

  // Animation settings
  FLOAT_ANIMATION_DURATION: '6s',  // How long one float cycle takes
  PULSE_SCALE: 1.15,               // How much circles grow on hover (1.15 = 15% larger)

  // Overlap prevention
  MIN_DISTANCE_BETWEEN_NODES: 25,  // Minimum space between circle edges
};

/**
 * ============================================
 * CHANNEL DATA CONFIGURATION
 * ============================================
 * Backend: Replace this mock data with API calls
 *
 * Expected data structure for each channel:
 * - channel: Display name of the marketing channel
 * - revenue: Total revenue generated (in currency units)
 * - spend: Total ad spend (in currency units)
 * - roi: Return on investment ratio (revenue/spend)
 * - performance: Status indicator - must be one of:
 *   'Exceptional' (green), 'Excellent' (green),
 *   'Satisfactory' (yellow), 'Failing' (red)
 */
const mockChannels: ChannelPerformance[] = [
  { channel: 'Facebook', revenue: 245000, spend: 45000, roi: 5.44, performance: 'Excellent' },
  { channel: 'Instagram Bio', revenue: 189000, spend: 32000, roi: 5.91, performance: 'Excellent' },
  { channel: 'Google Ads', revenue: 312000, spend: 58000, roi: 5.38, performance: 'Exceptional' },
  { channel: 'Email', revenue: 156000, spend: 28000, roi: 5.57, performance: 'Satisfactory' },
];

/**
 * ============================================
 * SYSTEM MAP COMPONENT - BACKEND INTEGRATION GUIDE
 * ============================================
 *
 * This component visualizes marketing channel performance as an interactive network graph.
 *
 * KEY CONFIGURATION SECTIONS FOR BACKEND:
 *
 * 1. VISUAL_CONFIG (lines 38-51)
 *    - Control node sizes, icons, labels, and animations
 *    - Adjust these to fine-tune appearance
 *
 * 2. performanceColors (lines 33-37)
 *    - Maps performance status to circle colors (green/yellow/red)
 *
 * 3. mockChannels (lines 64-71)
 *    - REPLACE with API call to fetch real channel data
 *    - Required fields: channel, revenue, spend, roi, performance
 *
 * 4. networkNodes (lines 84-89)
 *    - Define node positions and properties
 *    - x, y coordinates are percentages (0-100)
 *
 * 5. networkEdges (lines 104-109)
 *    - Define connections between channels
 *    - strength: 'strong' (green), 'medium' (yellow), 'weak' (red)
 *
 * 6. getTwoConnectionMetrics (lines 257-271)
 *    - REPLACE with API call for connection analytics
 *
 * 7. getNodeColor (lines 139-158)
 *    - Update channelMap when adding/removing nodes
 *
 * FEATURES:
 * - Floating animation: Graph gently moves up and down
 * - Pulsing on hover/click: Circles grow and pulse when interacted with
 * - Overlap prevention: Lines adjust to avoid overlapping with circles
 * - Color coding: Green (good), Yellow (moderate), Red (poor performance)
 * - Responsive design: Works on mobile and desktop
 */
export default function SystemMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [animatedNodes, setAnimatedNodes] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size for responsive positioning
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animate nodes on mount
  useEffect(() => {
    const nodes = ['facebook', 'instagram', 'google', 'email'];
    nodes.forEach((nodeId, index) => {
      setTimeout(() => {
        setAnimatedNodes(prev => new Set(prev).add(nodeId));
      }, index * 200);
    });
  }, []);

  /**
   * ============================================
   * NETWORK NODE POSITIONS - RESPONSIVE
   * ============================================
   * Backend: Define node positions in the graph
   *
   * Positions automatically adjust based on screen size:
   * - Desktop/Tablet: Wider horizontal spacing for better visibility
   * - Mobile: Tighter spacing to fit smaller screens
   *
   * Coordinates are in percentage (0-100) of the SVG viewBox:
   * - x: Horizontal position (0=left, 100=right)
   * - y: Vertical position (0=top, 100=bottom)
   * - id: Unique identifier (must match channel mapping)
   * - name: Display label for the node
   * - revenue: Used to calculate circle size (higher revenue = larger circle)
   *
   * Note: Positions are automatically adjusted to prevent overlap
   */
  const networkNodes: NetworkNode[] = isMobile
    ? [
        // Mobile layout - Tighter spacing
        { id: 'facebook', name: 'Facebook Ads', revenue: 245000, x: 20, y: 45 },
        { id: 'instagram', name: 'Instagram', revenue: 189000, x: 50, y: 25 },
        { id: 'google', name: 'Google Ads', revenue: 312000, x: 80, y: 45 },
        { id: 'email', name: 'Email', revenue: 156000, x: 50, y: 72 },
      ]
    : [
        // Desktop layout - Maximum horizontal spread with closer Instagram
        { id: 'facebook', name: 'Facebook Ads', revenue: 245000, x: 2, y: 45 },
        { id: 'instagram', name: 'Instagram', revenue: 189000, x: 50, y: 30 },
        { id: 'google', name: 'Google Ads', revenue: 312000, x: 98, y: 45 },
        { id: 'email', name: 'Email', revenue: 156000, x: 50, y: 78 },
      ];

  /**
   * ============================================
   * NETWORK CONNECTIONS
   * ============================================
   * Backend: Define relationships between channels
   *
   * Edge properties:
   * - from: Source node id
   * - to: Target node id
   * - strength: Connection quality - 'strong' (green), 'medium' (yellow), 'weak' (red)
   *
   * Lines will automatically adjust their paths to prevent overlap with circles
   */
  const networkEdges: NetworkEdge[] = [
    { from: 'facebook', to: 'instagram', strength: 'strong' },
    { from: 'instagram', to: 'google', strength: 'strong' },
    { from: 'google', to: 'email', strength: 'medium' },
    { from: 'email', to: 'facebook', strength: 'medium' },
  ];

  /**
   * ============================================
   * NODE COLOR MAPPING
   * ============================================
   * Backend: This function determines circle colors based on performance
   *
   * Process:
   * 1. Maps node ID to channel name
   * 2. Looks up channel in mockChannels data
   * 3. Returns color based on performance status:
   *    - Green (#10b981): Exceptional, Excellent
   *    - Yellow (#f59e0b): Satisfactory
   *    - Red (#ef4444): Failing
   *    - Gray (#64748b): No data/default
   *
   * Backend: Update channelMap when adding/removing nodes
   */
  const getNodeColor = (nodeId: string): string => {
    const channelMap: { [key: string]: string } = {
      'facebook': 'Facebook',
      'instagram': 'Instagram Bio',
      'google': 'Google Ads',
      'email': 'Email',
    };

    const channelName = channelMap[nodeId];
    const channel = mockChannels.find(ch => ch.channel === channelName || ch.channel.includes(channelName));

    if (channel) {
      return performanceColors[channel.performance] || '#64748b';
    }
    return '#64748b';
  };

  // Sort nodes by revenue to determine size ranking
  const sortedByRevenue = [...networkNodes].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = sortedByRevenue[0].revenue;
  const minRevenue = sortedByRevenue[sortedByRevenue.length - 1].revenue;

  /**
   * Calculate node size based on revenue
   * Backend: This determines circle diameter based on performance metrics
   * Uses VISUAL_CONFIG.NODE_MIN_SIZE and NODE_MAX_SIZE
   */
  const getNodeSize = (revenue: number) => {
    const range = maxRevenue - minRevenue;
    const normalized = range > 0 ? (revenue - minRevenue) / range : 0.5;
    return VISUAL_CONFIG.NODE_MIN_SIZE + (normalized * (VISUAL_CONFIG.NODE_MAX_SIZE - VISUAL_CONFIG.NODE_MIN_SIZE));
  };

  /**
   * Check if two nodes overlap and return adjustment if needed
   * Backend: This prevents circles from overlapping when they grow too large
   */
  const checkNodeOverlap = (node1: NetworkNode, node2: NetworkNode): boolean => {
    const size1 = getNodeSize(node1.revenue) / 15; // Scale to viewBox
    const size2 = getNodeSize(node2.revenue) / 15;
    const distance = Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));
    const minDistance = (size1 + size2) / 2 + VISUAL_CONFIG.MIN_DISTANCE_BETWEEN_NODES / 15;
    return distance < minDistance;
  };

  /**
   * ============================================
   * EDGE (LINE) STYLING
   * ============================================
   * Backend: Controls the appearance of connection lines between nodes
   *
   * Connection strength determines line color:
   * - strong: Green (#10b981) - High synergy/performance
   * - medium: Yellow (#f59e0b) - Moderate connection
   * - weak: Red (#ef4444) - Low performance/weak link
   * - default: Gray (#64748b) - No data
   *
   * Adjust strokeWidth and opacity to make lines more/less prominent
   */
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
    // Larger icons for better visibility
    const iconProps = { className: "w-full h-full", fill: "white", viewBox: "0 0 24 24" };

    switch (nodeId) {
      case 'facebook':
        return (
          <svg {...iconProps} >
            <path d="M24 12.073c0-6.667-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg {...iconProps} >
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
          </svg>
        );
      case 'google':
        return (
          <svg {...iconProps} viewBox="0 0 48 48">
            <path fill="white" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
        );
      case 'email':
        return (
          <svg {...iconProps}>
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
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
      'email': 'Email',
    };

    const channelName = channelMap[nodeId];
    const channel = mockChannels.find(ch => ch.channel === channelName || ch.channel.includes(channelName));
    
    return { node, channel };
  };

  const getNodeConnections = (nodeId: string): NodeConnection[] => {
    const connections: NodeConnection[] = [];
    
    // Find outgoing connections
    networkEdges.forEach(edge => {
      if (edge.from === nodeId) {
        connections.push({
          type: 'outgoing',
          fromNode: edge.from,
          toNode: edge.to,
          strength: edge.strength
        });
      }
      if (edge.to === nodeId) {
        connections.push({
          type: 'incoming',
          fromNode: edge.from,
          toNode: edge.to,
          strength: edge.strength
        });
      }
    });
    
    return connections;
  };

  const getNodeNameById = (nodeId: string): string => {
    return networkNodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'strong': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#64748b';
    }
  };

  /**
   * ============================================
   * CONNECTION METRICS - TWO NODE PATH
   * ============================================
   * Backend: Replace with API endpoint that returns metrics for direct connections
   *
   * Expected return format:
   * {
   *   conversions: number,  // Total conversions through this path
   *   revenue: number,      // Revenue generated from this connection
   *   ctr: number          // Click-through rate (percentage)
   * }
   *
   * These metrics appear in the detail panel when a node is selected
   */
  const getTwoConnectionMetrics = (fromNode: string, toNode: string) => {
    const metrics: { [key: string]: { conversions: number; revenue: number; ctr: number } } = {
      'facebook-instagram': { conversions: 234, revenue: 45000, ctr: 3.2 },
      'instagram-google': { conversions: 312, revenue: 58000, ctr: 4.1 },
      'google-email': { conversions: 189, revenue: 32000, ctr: 2.8 },
      'email-facebook': { conversions: 156, revenue: 28000, ctr: 2.3 },
      'facebook-google': { conversions: 218, revenue: 2800, ctr: 2.7 },
    };

    const key = `${fromNode}-${toNode}`;
    return metrics[key] || { conversions: 0, revenue: 0, ctr: 0 };
  };

  /**
   * ============================================
   * CONNECTION METRICS - THREE NODE PATH
   * ============================================
   * Backend: Replace with API endpoint for multi-hop connection analytics
   *
   * Tracks performance across three-node customer journeys
   * Format same as getTwoConnectionMetrics
   */
  const getThreeConnectionMetrics = (fromNode: string, toSecondNode: string, toLastNode: string) => {
    const metrics: { [key: string]: { conversions: number; revenue: number; ctr: number } } = {
      'facebook-instagram-email': { conversions: 234, revenue: 45000, ctr: 3.2 },
      'instagram-google-facebook': { conversions: 312, revenue: 58000, ctr: 4.1 },
      'google-email-instagram': { conversions: 189, revenue: 32000, ctr: 2.8 },
      'email-facebook-instagram': { conversions: 156, revenue: 28000, ctr: 2.3 },
      'email-facebook-google': { conversions: 218, revenue: 2800, ctr: 2.7 },
    };

    const key = `${fromNode}-${toSecondNode}-${toLastNode}`;
    return metrics[key] || { conversions: 0, revenue: 0, ctr: 0 };
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header - Fixed to avoid hamburger menu overlap */}
      <div className="p-4 sm:p-6 pl-16 sm:pl-20 lg:pb-2">
        {/* Header */}
        <div className="mb-3 lg:mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            System Map
          </h1>
          <p className="text-gray-400 text-sm">
            Real-time insights into your marketing channels
          </p>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left side - Graph and Legend */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 pb-4 lg:pt-0 overflow-hidden">
          <div className="flex-1 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden flex flex-col min-h-0">
            {/* Network Graph with Grid Background - Now with proper centering and floating animation */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(75, 85, 99, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(75, 85, 99, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px',
                backgroundPosition: 'center center'
              }}
            >
              <svg className="w-full h-full animate-float" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {/* Draw edges with animation and overlap prevention */}
                {networkEdges.map((edge, idx) => {
                  const fromNode = networkNodes.find(n => n.id === edge.from);
                  const toNode = networkNodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const style = getEdgeStyle(edge.strength);
                  const isConnectedToSelected = selectedNode === edge.from || selectedNode === edge.to;

                  /**
                   * Backend: Edge path calculation with overlap prevention
                   * When circles grow too large, edges are shortened to stop at circle boundaries
                   */
                  const fromSize = getNodeSize(fromNode.revenue) / 15;
                  const toSize = getNodeSize(toNode.revenue) / 15;

                  // Calculate angle between nodes
                  const dx = toNode.x - fromNode.x;
                  const dy = toNode.y - fromNode.y;
                  const angle = Math.atan2(dy, dx);

                  // Adjust start/end points to circle edges (preventing overlap)
                  const hasOverlap = checkNodeOverlap(fromNode, toNode);
                  const padding = hasOverlap ? 0.5 : 0.3; // Extra space when nodes are close

                  const x1 = fromNode.x + Math.cos(angle) * (fromSize + padding);
                  const y1 = fromNode.y + Math.sin(angle) * (fromSize + padding);
                  const x2 = toNode.x - Math.cos(angle) * (toSize + padding);
                  const y2 = toNode.y - Math.sin(angle) * (toSize + padding);

                  return (
                    <g key={idx}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={style.stroke}
                        strokeWidth={isConnectedToSelected ? 0.6 : 0.4}
                        strokeDasharray={style.strokeDasharray}
                        opacity={isConnectedToSelected ? 1 : style.opacity}
                        className="transition-all duration-500 ease-out"
                      />
                      {/* Arrow head */}
                      <defs>
                        <marker
                          id={`arrow-${idx}`}
                          markerWidth="4"
                          markerHeight="4"
                          refX="3.5"
                          refY="2"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L0,4 L4,2 z" fill={style.stroke} />
                        </marker>
                      </defs>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={style.stroke}
                        strokeWidth={isConnectedToSelected ? 0.6 : 0.4}
                        opacity={isConnectedToSelected ? 1 : style.opacity}
                        markerEnd={`url(#arrow-${idx})`}
                        className="transition-all duration-500"
                      />
                    </g>
                  );
                })}

                {/* Draw nodes with enhanced animation */}
                {networkNodes.map((node) => {
                  const baseSize = getNodeSize(node.revenue);
                  const size = baseSize / 15; // Scale down for viewBox
                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedNode === node.id;
                  const nodeColor = getNodeColor(node.id);
                  const isAnimated = animatedNodes.has(node.id);
                  
                  return (
                    <g 
                      key={node.id}
                      style={{
                        opacity: isAnimated ? 1 : 0,
                        transform: isAnimated ? 'scale(1)' : 'scale(0)',
                        transformOrigin: `${node.x}px ${node.y}px`,
                        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {/* Enhanced pulsing glow for selected/hovered - uses VISUAL_CONFIG.PULSE_SCALE */}
                      {(isHovered || isSelected) && (
                        <>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size * VISUAL_CONFIG.PULSE_SCALE + 2}
                            fill={nodeColor}
                            opacity="0.2"
                            className="animate-pulse-strong"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size * VISUAL_CONFIG.PULSE_SCALE + 1}
                            fill={nodeColor}
                            opacity="0.35"
                            className="animate-pulse-strong"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={size * 1.08}
                            fill={nodeColor}
                            opacity="0.5"
                            className="animate-pulse-strong"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </>
                      )}
                      
                      {/* Outer ring */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size + 0.3}
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth={isSelected ? "0.3" : "0.15"}
                        opacity={isSelected ? 0.8 : 0.4}
                        className="transition-all duration-300"
                      />
                      
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size}
                        fill={nodeColor}
                        fillOpacity="0.15"
                        stroke={nodeColor}
                        strokeWidth={isSelected ? "0.25" : "0.15"}
                        className="backdrop-blur-sm transition-all duration-300"
                      />
                      
                      {/* Main colored circle with enhanced pulse effect */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={(size - 0.3) * (isHovered || isSelected ? 1.08 : 1)}
                        fill={nodeColor}
                        opacity="0.95"
                        className="cursor-pointer transition-all duration-500 ease-out hover:opacity-100"
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                        style={{
                          filter: (isHovered || isSelected) ? 'brightness(1.3) drop-shadow(0 0 8px currentColor)' : 'brightness(1)',
                          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />
                      
                      {/* Social media icon in center - Sized using VISUAL_CONFIG */}
                      <foreignObject
                        x={node.x - VISUAL_CONFIG.ICON_SIZE / 2}
                        y={node.y - VISUAL_CONFIG.ICON_SIZE / 2}
                        width={VISUAL_CONFIG.ICON_SIZE}
                        height={VISUAL_CONFIG.ICON_SIZE}
                        className="pointer-events-none"
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

            {/* Legend - Below graph, hidden on mobile when details panel is open */}
            <div className={`border-t border-gray-800 p-3 sm:p-6 bg-gray-900/50 ${selectedNode ? 'hidden lg:block' : 'block'}`}>
              <div className="mb-3 sm:mb-4">
                <h4 className="font-bold text-sm sm:text-base mb-1 flex items-center text-blue-400">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Legend
                </h4>
                <p className="text-xs text-gray-500">Understand the connections</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-green-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div>
                    <p className="text-white font-semibold">Green solid</p>
                    <p className="text-gray-400 text-xs">Strong synergy</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-yellow-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div>
                    <p className="text-white font-semibold">Yellow solid</p>
                    <p className="text-gray-400 text-xs">Some reinforcement</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 sm:w-12 h-1 bg-red-500 mr-2 sm:mr-3 mt-1.5 sm:mt-2 flex-shrink-0 rounded"></div>
                  <div>
                    <p className="text-white font-semibold">Red solid</p>
                    <p className="text-gray-400 text-xs">Weak connection</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center mr-2 sm:mr-3 mt-1 flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500"></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 -ml-2 sm:-ml-3"></div>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Node size</p>
                    <p className="text-gray-400 text-xs">Revenue volume indicator</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Click on nodes to see detailed information and relationships. Larger nodes indicate higher revenue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Details Panel (Desktop) / Bottom Panel (Mobile) */}
        {selectedNode && (
          <div className="lg:w-96 px-4 sm:px-6 pb-4 lg:pl-0 animate-slide-in lg:overflow-auto">
            <div className="h-full bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-auto max-h-[60vh] lg:max-h-none">
              <div className="p-4 sm:p-6">
                {/* Header with close button */}
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div 
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: getNodeColor(selectedNode) }}
                    >
                      <div className="text-white">
                        {getSocialIcon(selectedNode)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-xl text-white">
                        {getNodeDetails(selectedNode).node?.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400">Platform Details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-700/50 hover:bg-red-500/30 border border-gray-600 hover:border-red-500/50 flex items-center justify-center transition-all text-gray-400 hover:text-red-400"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Performance Metrics */}
                {getNodeDetails(selectedNode).channel ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-lg p-3 sm:p-4 border border-gray-700 shadow-lg">
                      <div className="text-xs text-gray-400 mb-1">Revenue Generated</div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        ₱{(getNodeDetails(selectedNode).node?.revenue || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Ad Spend</div>
                        <div className="text-base sm:text-lg font-bold text-white">
                          ₱{(getNodeDetails(selectedNode).channel?.spend || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">ROI</div>
                        <div className="text-base sm:text-lg font-bold text-white">
                          {getNodeDetails(selectedNode).channel?.roi.toFixed(2)}x
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">Performance Status</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: performanceColors[getNodeDetails(selectedNode).channel?.performance || ''] }}
                        ></div>
                        <div className="text-sm sm:text-base font-semibold text-white">
                          {getNodeDetails(selectedNode).channel?.performance}
                        </div>
                      </div>
                    </div>

                    {/* Node Connections/Relations */}
                    <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-3 font-semibold flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Platform Connections
                      </div>
                      <div className="space-y-3">
                        {getNodeConnections(selectedNode).map((conn, idx) => {
                          const metrics = getTwoConnectionMetrics(conn.fromNode, conn.toNode);
                          return (
                            <div key={idx} className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                              {/* Connection header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1 flex-1 text-xs sm:text-sm">
                                  <span className="text-gray-300 font-medium truncate">
                                    {getNodeNameById(conn.fromNode)}
                                  </span>
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  <span className="text-gray-300 font-medium truncate">
                                    {getNodeNameById(conn.toNode)}
                                  </span>
                                </div>
                                <div 
                                  className="px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2"
                                  style={{ 
                                    backgroundColor: `${getStrengthColor(conn.strength)}20`,
                                    color: getStrengthColor(conn.strength)
                                  }}
                                >
                                  {conn.strength}
                                </div>
                              </div>
                              
                              {/* Connection metrics */}
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700/50">
                                <div>
                                  <div className="text-xs text-gray-500 mb-0.5">Conversions</div>
                                  <div className="text-sm font-bold text-white">{metrics.conversions}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-0.5">Revenue</div>
                                  <div className="text-sm font-bold text-green-400">₱{(metrics.revenue / 1000).toFixed(0)}K</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-0.5">CTR</div>
                                  <div className="text-sm font-bold text-blue-400">{metrics.ctr}%</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-blue-200/80">
                        This platform is{' '}
                        {getNodeDetails(selectedNode).channel?.performance === 'Exceptional' || 
                         getNodeDetails(selectedNode).channel?.performance === 'Excellent' 
                          ? 'performing well' 
                          : getNodeDetails(selectedNode).channel?.performance === 'Satisfactory'
                          ? 'performing adequately'
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

      <style>{`
        /* Floating animation for the entire graph */
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-float {
          animation: float ${VISUAL_CONFIG.FLOAT_ANIMATION_DURATION} ease-in-out infinite;
        }

        /* Enhanced pulse animation for hover/click states */
        @keyframes pulse-strong {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }


      `}</style>
    </div>
  );
}