import { useState } from 'react';
import type { JourneyPattern } from '@shared/types';

interface Props {
  patterns: JourneyPattern[];
  isLoading: boolean;
}

const channelColors: Record<string, string> = {
  facebook: '#3b82f6',
  'facebook ads': '#3b82f6',
  meta: '#3b82f6',
  google: '#10b981',
  'google ads': '#10b981',
  'google analytics': '#10b981',
  email: '#f59e0b',
  mailchimp: '#f59e0b',
  instagram: '#e879f9',
  'instagram bio': '#e879f9',
  tiktok: '#ef4444',
  direct: '#6b7280',
  organic: '#14b8a6',
  hubspot: '#f97316',
  stripe: '#6366f1',
  paypal: '#0ea5e9',
};

function getChannelColor(channel: string): string {
  const key = channel.toLowerCase();
  return channelColors[key] || '#64748b';
}

export default function JourneyFlowChart({ patterns, isLoading }: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const topPatterns = patterns.slice(0, 5);
  const maxFrequency = Math.max(...topPatterns.map(p => p.frequency), 1);

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ height: '100%', minHeight: '420px' }}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold">Top Conversion Journeys</h3>
        <p className="text-gray-400 text-xs mt-0.5">Most common multi-touch paths that lead to conversions</p>
      </div>

      <div className="p-4 h-[calc(100%-72px)] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : topPatterns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-4">
            No journey patterns detected yet. Connect platforms and collect conversion data to see attribution paths.
          </div>
        ) : (
          <div className="space-y-3">
            {topPatterns.map((pattern, idx) => {
              const isHovered = hoveredRow === idx;
              const isDimmed = hoveredRow !== null && !isHovered;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    isHovered
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-gray-800 bg-gray-900/30'
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {idx + 1}
                    </div>

                    {/* Channel sequence */}
                    <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                      {pattern.pattern.map((channel, chIdx) => (
                        <div key={chIdx} className="flex items-center gap-1.5">
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap"
                            style={{
                              backgroundColor: `${getChannelColor(channel)}30`,
                              border: `1px solid ${getChannelColor(channel)}50`,
                              color: getChannelColor(channel),
                            }}
                          >
                            {channel}
                          </span>
                          {chIdx < pattern.pattern.length - 1 && (
                            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-white text-sm font-mono font-semibold">₱{pattern.total_revenue.toLocaleString()}</p>
                      <p className="text-gray-500 text-xs">{pattern.frequency} conversions</p>
                    </div>
                  </div>

                  {/* Frequency bar */}
                  <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(pattern.frequency / maxFrequency) * 100}%`,
                        background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
