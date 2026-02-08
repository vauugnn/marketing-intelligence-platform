import { useState } from 'react';
import type { ChannelPerformance } from '@shared/types';

interface Props {
  channels: ChannelPerformance[];
  isLoading: boolean;
}

interface PipelineNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  description: string;
}

// Stage 1: E-commerce site (left)
const siteNode: PipelineNode = {
  id: 'ecommerce', label: 'E-Commerce Site', x: 6, y: 50, color: '#10b981',
  description: 'A customer makes a purchase on your website — the starting point of all attribution data',
};

// Stage 2: Tracking pixel captures data
const pixelNode: PipelineNode = {
  id: 'pixel', label: 'Tracking Pixel', x: 25, y: 50, color: '#8b5cf6',
  description: 'Captures purchase details, email, session data, UTM parameters, and page interactions in real time',
};

// Stage 3: Platforms verify the data
const platformDefs = [
  { id: 'ga4', label: 'Google Analytics', color: '#10b981', description: 'Verifies if the user session originated from Google search or ads' },
  { id: 'meta', label: 'Meta', color: '#3b82f6', description: 'Checks if the user interacted with Facebook or Instagram ads before purchasing' },
  { id: 'payment_systems', label: 'Payment Systems', color: '#6366f1', description: 'Confirms payment transaction details and cross-references payment providers for verification' },
  { id: 'hubspot', label: 'Email Systems', color: '#f97316', description: 'Validates CRM contact records and deal associations for the customer' },
];

const platformNodes: PipelineNode[] = platformDefs.map((d, i) => {
  const x = 46;
  const startY = 18; // top-most platform Y
  const spacing = 22; // vertical spacing between platform nodes
  const y = startY + i * spacing;
  return { id: d.id, label: d.label, x, y, color: d.color, description: d.description };
});

// Stage 4: Attribution engine
const engineNode: PipelineNode = {
  id: 'engine', label: 'Attribution Engine', x: 78, y: 50, color: '#f59e0b',
  description: 'Cross-references platform responses, scores confidence (85-95% accuracy), and builds verified conversion records',
};

// Stage 5: Insights output
const insightNodes: PipelineNode[] = [
  { id: 'performance', label: 'Performance', x: 97, y: 22, color: '#10b981', description: 'Revenue, spend, ROI, and performance ratings per channel' },
  { id: 'synergy', label: 'Synergies', x: 97, y: 50, color: '#3b82f6', description: 'How channels amplify each other — synergy scores and frequencies' },
  { id: 'recommendations', label: 'AI Actions', x: 97, y: 78, color: '#f59e0b', description: 'Scale, optimize, or stop — AI-powered budget decisions' },
];

const allNodes: PipelineNode[] = [siteNode, pixelNode, ...platformNodes, engineNode, ...insightNodes];

const platformIcons: Record<string, JSX.Element> = {
  ga4: (
    <svg viewBox="0 0 48 48" fill="white" className="w-4 h-4">
      <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <text x="12" y="16" fill="white" fontSize="15" fontWeight="bold" fontFamily="Arial, sans-serif" textAnchor="middle">Meta</text>
    </svg>
  ),
  payment_systems: (
    <svg viewBox="0 0 32 32" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="psGrad" x1="0" x2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="psShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#psGrad)" filter="url(#psShadow)" />

      <g transform="translate(5,7)">
        <rect x="0" y="0" width="22" height="10" rx="2" fill="rgba(255,255,255,0.12)" />
        <rect x="2" y="6" width="20" height="10" rx="2" fill="rgba(255,255,255,0.18)" />

        <rect x="3" y="2" width="6" height="2" rx="0.8" fill="white" opacity="0.95" />
        <circle cx="16" cy="11" r="2.2" fill="white" opacity="0.95" />

        <path d="M14.6 10.2 L17 13" stroke="#7c3aed" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  ),
  hubspot: (
    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
      <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.2 2.2 0 0017.23.833h-.066a2.2 2.2 0 00-2.2 2.2v.067c0 .858.5 1.598 1.225 1.953v2.88a6.27 6.27 0 00-2.9 1.47l-7.8-6.07a2.27 2.27 0 00.078-.546A2.288 2.288 0 003.28 .5 2.288 2.288 0 00.992 2.788 2.288 2.288 0 003.28 5.076c.487 0 .94-.156 1.313-.418l7.65 5.955a6.3 6.3 0 00-.93 3.305c0 1.27.378 2.452 1.025 3.446l-2.17 2.17a1.87 1.87 0 00-.546-.085 1.9 1.9 0 00-1.898 1.898 1.9 1.9 0 001.898 1.898 1.9 1.9 0 001.898-1.898c0-.2-.033-.39-.09-.57l2.12-2.12a6.312 6.312 0 009.612-5.373 6.313 6.313 0 00-4.998-6.173z" />
    </svg>
  ),
};

export default function DataPipelineFlow({ channels, isLoading }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const totalConversions = channels.reduce((sum, ch) => sum + ch.conversions, 0);
  const activeChannels = channels.length;

  const hoveredInfo = allNodes.find(n => n.id === hoveredNode);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Data Pipeline</h3>
          <p className="text-gray-400 text-xs mt-0.5">End-to-end: purchase capture → platform verification → attribution insights</p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Active Channels</p>
              <p className="text-sm font-mono font-bold text-blue-400">{activeChannels}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Conversions</p>
              <p className="text-sm font-mono font-bold text-green-400">{totalConversions.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid-pattern relative" style={{ height: '380px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Stage 1→2: Site → Pixel */}
                <path id="path-site-pixel" d={`M ${siteNode.x + 4} ${siteNode.y} L ${pixelNode.x - 4} ${pixelNode.y}`} fill="none" />

                {/* Stage 2→3: Pixel → each platform (outgoing verification request) */}
                {platformNodes.map((p) => (
                  <path
                    key={`path-px-${p.id}`}
                    id={`path-px-${p.id}`}
                    d={`M ${pixelNode.x + 4} ${pixelNode.y} Q ${(pixelNode.x + p.x) / 2} ${p.y} ${p.x - 5} ${p.y}`}
                    fill="none"
                  />
                ))}

                {/* Stage 3→4: Platform → Engine (verification response) */}
                {platformNodes.map((p) => (
                  <path
                    key={`path-pr-${p.id}`}
                    id={`path-pr-${p.id}`}
                    d={`M ${p.x + 5} ${p.y} Q ${(p.x + engineNode.x) / 2} ${p.y} ${engineNode.x - 4} ${engineNode.y}`}
                    fill="none"
                  />
                ))}

                {/* Stage 4→5: Engine → Insight outputs */}
                {insightNodes.map((ins) => (
                  <path
                    key={`path-ei-${ins.id}`}
                    id={`path-ei-${ins.id}`}
                    d={`M ${engineNode.x + 4} ${engineNode.y} Q ${(engineNode.x + ins.x) / 2} ${ins.y} ${ins.x - 4} ${ins.y}`}
                    fill="none"
                  />
                ))}
              </defs>

              {/* Stage labels */}
              <text x={siteNode.x} y="5" fill="#6b7280" fontSize="1.8" fontWeight="600" textAnchor="middle">CAPTURE</text>
              <text x={pixelNode.x} y="5" fill="#6b7280" fontSize="1.8" fontWeight="600" textAnchor="middle">PIXEL</text>
              <text x="50" y="5" fill="#6b7280" fontSize="1.8" fontWeight="600" textAnchor="middle">VERIFICATION</text>
              <text x={engineNode.x} y="5" fill="#6b7280" fontSize="1.8" fontWeight="600" textAnchor="middle">ATTRIBUTION</text>
              <text x="93" y="5" fill="#6b7280" fontSize="1.8" fontWeight="600" textAnchor="middle">INSIGHTS</text>

              {/* Divider lines */}
              <line x1="16" y1="8" x2="16" y2="96" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" strokeDasharray="1 1" />
              <line x1="37" y1="8" x2="37" y2="96" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" strokeDasharray="1 1" />
              <line x1="63" y1="8" x2="63" y2="96" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" strokeDasharray="1 1" />
              <line x1="85" y1="8" x2="85" y2="96" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" strokeDasharray="1 1" />

              {/* ---- Visible connection paths ---- */}

              {/* Site → Pixel */}
              <use href="#path-site-pixel" stroke={siteNode.color} strokeWidth="0.35" strokeOpacity="0.25" fill="none" />

              {/* Pixel → Platforms (outgoing — purple) */}
              {platformNodes.map((p) => (
                <use key={`vis-px-${p.id}`} href={`#path-px-${p.id}`} stroke="#8b5cf6" strokeWidth="0.3" strokeOpacity="0.2" fill="none" />
              ))}

              {/* Platforms → Engine (return — platform color) */}
              {platformNodes.map((p) => (
                <use key={`vis-pr-${p.id}`} href={`#path-pr-${p.id}`} stroke={p.color} strokeWidth="0.3" strokeOpacity="0.2" fill="none" />
              ))}

              {/* Engine → Insights */}
              {insightNodes.map((ins) => (
                <use key={`vis-ei-${ins.id}`} href={`#path-ei-${ins.id}`} stroke={ins.color} strokeWidth="0.3" strokeOpacity="0.2" fill="none" />
              ))}

              {/* ---- Animated dots ---- */}

              {/* Site → Pixel (green dots) */}
              {[0, 1.5].map((delay, i) => (
                <circle key={`dot-sp-${i}`} r="0.7" fill={siteNode.color} opacity="0.9">
                  <animateMotion dur="2s" repeatCount="indefinite" begin={`${delay}s`}>
                    <mpath href="#path-site-pixel" />
                  </animateMotion>
                </circle>
              ))}

              {/* Pixel → Platforms (purple dots — data sent for verification) */}
              {platformNodes.map((p, i) => (
                <g key={`dots-px-${p.id}`}>
                  <circle r="0.6" fill="#8b5cf6" opacity="0.85">
                    <animateMotion dur={`${2.2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3}s`}>
                      <mpath href={`#path-px-${p.id}`} />
                    </animateMotion>
                  </circle>
                  <circle r="0.6" fill="#8b5cf6" opacity="0.85">
                    <animateMotion dur={`${2.2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3 + 1.2}s`}>
                      <mpath href={`#path-px-${p.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}

              {/* Platforms → Engine (platform-colored dots — verification response) */}
              {platformNodes.map((p, i) => (
                <g key={`dots-pr-${p.id}`}>
                  <circle r="0.6" fill={p.color} opacity="0.85">
                    <animateMotion dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.35 + 0.8}s`}>
                      <mpath href={`#path-pr-${p.id}`} />
                    </animateMotion>
                  </circle>
                  <circle r="0.6" fill={p.color} opacity="0.85">
                    <animateMotion dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.35 + 1.8}s`}>
                      <mpath href={`#path-pr-${p.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}

              {/* Engine → Insights (colored dots) */}
              {insightNodes.map((ins, i) => (
                <g key={`dots-ei-${ins.id}`}>
                  <circle r="0.7" fill={ins.color} opacity="0.9">
                    <animateMotion dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.4}s`}>
                      <mpath href={`#path-ei-${ins.id}`} />
                    </animateMotion>
                  </circle>
                  <circle r="0.7" fill={ins.color} opacity="0.9">
                    <animateMotion dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.4 + 1}s`}>
                      <mpath href={`#path-ei-${ins.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}

              {/* ---- E-Commerce Site node ---- */}
              <g
                onMouseEnter={() => setHoveredNode('ecommerce')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {hoveredNode === 'ecommerce' && (
                  <circle cx={siteNode.x} cy={siteNode.y} r="7" fill={siteNode.color} opacity="0.12" />
                )}
                <circle cx={siteNode.x} cy={siteNode.y} r="5.5" fill={siteNode.color} fillOpacity="0.15" stroke={siteNode.color} strokeWidth="0.5" />
                <circle cx={siteNode.x} cy={siteNode.y} r="4.5" fill={siteNode.color} opacity="0.6" />
                <foreignObject x={siteNode.x - 1.8} y={siteNode.y - 1.8} width="3.6" height="3.6">
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                </foreignObject>
                <text x={siteNode.x} y={siteNode.y + 8.5} fill="#d1d5db" fontSize="2" fontWeight="600" textAnchor="middle">E-Commerce</text>
                <text x={siteNode.x} y={siteNode.y + 11} fill="#9ca3af" fontSize="1.6" textAnchor="middle">Site</text>
              </g>

              {/* ---- Tracking Pixel node ---- */}
              <g
                onMouseEnter={() => setHoveredNode('pixel')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Radar pulse */}
                <circle cx={pixelNode.x} cy={pixelNode.y} r="4" fill="none" stroke={pixelNode.color} strokeWidth="0.2" opacity="0.4">
                  <animate attributeName="r" values="4;10;4" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx={pixelNode.x} cy={pixelNode.y} r="4" fill="none" stroke={pixelNode.color} strokeWidth="0.2" opacity="0.3">
                  <animate attributeName="r" values="4;10;4" dur="3s" repeatCount="indefinite" begin="1.5s" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" begin="1.5s" />
                </circle>
                {hoveredNode === 'pixel' && (
                  <circle cx={pixelNode.x} cy={pixelNode.y} r="7.5" fill={pixelNode.color} opacity="0.12" />
                )}
                <circle cx={pixelNode.x} cy={pixelNode.y} r="5.5" fill={pixelNode.color} fillOpacity="0.15" stroke={pixelNode.color} strokeWidth="0.5" />
                <circle cx={pixelNode.x} cy={pixelNode.y} r="4.5" fill={pixelNode.color} opacity="0.6" />
                <foreignObject x={pixelNode.x - 1.8} y={pixelNode.y - 1.8} width="3.6" height="3.6">
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                </foreignObject>
                <text x={pixelNode.x} y={pixelNode.y + 8.5} fill="#d1d5db" fontSize="2" fontWeight="600" textAnchor="middle">Tracking</text>
                <text x={pixelNode.x} y={pixelNode.y + 11} fill="#9ca3af" fontSize="1.6" textAnchor="middle">Pixel</text>
              </g>

              {/* ---- Platform verification nodes ---- */}
              {platformNodes.map((node) => {
                const labelOffset = node.id === 'payment_systems' ? 9 : 5.5;
                const labelX = node.x + labelOffset;
                const anchor = 'start';

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {hoveredNode === node.id && (
                      <circle cx={node.x} cy={node.y} r="5.5" fill={node.color} opacity="0.15" />
                    )}
                    <circle cx={node.x} cy={node.y} r="4" fill={node.color} fillOpacity="0.15" stroke={node.color} strokeWidth="0.4" />
                    <circle cx={node.x} cy={node.y} r="3.2" fill={node.color} opacity="0.7" />
                     <foreignObject x={node.x - 1.5} y={node.y - 1.5} width="3" height="3">
                      <div className="w-full h-full flex items-center justify-center">
                        {platformIcons[node.id]}
                      </div>
                    </foreignObject>
                    <text x={labelX} y={node.y - 0.5} fill="#d1d5db" fontSize="2" fontWeight="500" dominantBaseline="middle" textAnchor={anchor}>
                      {node.label}
                    </text>
                    <text x={labelX} y={node.y + 2} fill="#6b7280" fontSize="1.5" dominantBaseline="middle" textAnchor={anchor}>
                      Verify &amp; Respond
                    </text>
                  </g>
                );
              })}

              {/* ---- Attribution Engine node ---- */}
              <g
                onMouseEnter={() => setHoveredNode('engine')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {hoveredNode === 'engine' && (
                  <circle cx={engineNode.x} cy={engineNode.y} r="7.5" fill={engineNode.color} opacity="0.12" />
                )}
                <circle cx={engineNode.x} cy={engineNode.y} r="5.5" fill={engineNode.color} fillOpacity="0.15" stroke={engineNode.color} strokeWidth="0.5" />
                <circle cx={engineNode.x} cy={engineNode.y} r="4.5" fill={engineNode.color} opacity="0.6" />
                <foreignObject x={engineNode.x - 1.8} y={engineNode.y - 1.8} width="3.6" height="3.6">
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                  </div>
                </foreignObject>
                <text x={engineNode.x} y={engineNode.y + 8.5} fill="#d1d5db" fontSize="2" fontWeight="600" textAnchor="middle">Attribution</text>
                <text x={engineNode.x} y={engineNode.y + 11} fill="#9ca3af" fontSize="1.6" textAnchor="middle">Engine</text>
              </g>

              {/* ---- Insight output nodes ---- */}
              {insightNodes.map((node) => (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {hoveredNode === node.id && (
                    <rect x={node.x - 8} y={node.y - 4.5} width="16" height="9" rx="2" fill={node.color} opacity="0.1" />
                  )}
                  <rect x={node.x - 7} y={node.y - 3.5} width="14" height="7" rx="1.5" fill={node.color} fillOpacity="0.12" stroke={node.color} strokeWidth="0.3" />
                  <text x={node.x} y={node.y + 0.8} fill="#e5e7eb" fontSize="1.8" fontWeight="500" textAnchor="middle">
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Flow direction arrows (small triangles on paths) */}
              <defs>
                <marker id="arrowGreen" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
                  <polygon points="0,0 3,1.5 0,3" fill="#10b981" opacity="0.5" />
                </marker>
                <marker id="arrowPurple" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
                  <polygon points="0,0 3,1.5 0,3" fill="#8b5cf6" opacity="0.5" />
                </marker>
                <marker id="arrowGold" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
                  <polygon points="0,0 3,1.5 0,3" fill="#f59e0b" opacity="0.5" />
                </marker>
              </defs>
            </svg>

            {/* Step labels along the bottom */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-4">
              {[
                { step: '1', text: 'Customer purchases', color: '#10b981' },
                { step: '2', text: 'Pixel captures data', color: '#8b5cf6' },
                { step: '3', text: 'Platforms verify user', color: '#3b82f6' },
                { step: '4', text: 'Confirm attribution', color: '#f59e0b' },
                { step: '5', text: 'Generate insights', color: '#10b981' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.step}
                  </span>
                  <span className="text-gray-500 text-[10px] whitespace-nowrap">{s.text}</span>
                </div>
              ))}
            </div>

            {/* Hover tooltip */}
            {hoveredInfo && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 shadow-xl max-w-sm text-center pointer-events-none z-10">
                <p className="text-white text-xs font-semibold">{hoveredInfo.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{hoveredInfo.description}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
