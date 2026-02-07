import { useState } from 'react';
import SystemMapComponent from '../components/SystemMapComponent';

// Mock data - replace with actual data from your API/state management
const mockChannels = [
  { channel: 'Facebook', revenue: 245000, spend: 45000, roi: 5.44, performance: 'Excellent' },
  { channel: 'Instagram Bio', revenue: 189000, spend: 32000, roi: 5.91, performance: 'Excellent' },
  { channel: 'Google Ads', revenue: 312000, spend: 58000, roi: 5.38, performance: 'Exceptional' },
  { channel: 'LinkedIn', revenue: 156000, spend: 28000, roi: 5.57, performance: 'Failing' },
  { channel: 'X (Twitter)', revenue: 98000, spend: 22000, roi: 4.45, performance: 'Failing' },
];

export default function SystemMap() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          System Map
        </h2>
        <p className="text-gray-400">
          Visualize how your marketing channels work together
        </p>
      </div>

      {/* System Map Component */}
      <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <SystemMapComponent
          channels={mockChannels}
          isExpanded={isExpanded}
          onToggleExpand={setIsExpanded}
        />
      </div>

      {/* Info Card */}
      {!isExpanded && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 md:p-5 rounded-lg">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-300 mb-2">
                Understanding Channel Relationships
              </h4>
              <ul className="space-y-1.5 text-sm text-blue-200/80">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-blue-200">Thick solid lines</strong> = Strong synergy between platforms</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-blue-200">Medium lines</strong> = Some cross-platform reinforcement</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-blue-200">Thin/dashed lines</strong> = Weak or isolated connections</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong className="text-blue-200">Node size</strong> = Proportional to revenue generated</span>
                </li>
              </ul>
              <p className="text-xs text-blue-300/60 mt-3">
                Click the expand button to see detailed platform information and relationships
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data collection notice (show if no real data) */}
      {mockChannels.length === 0 && (
        <div className="mt-6 bg-gray-800/40 border border-gray-700/50 p-6 rounded-lg text-center">
          <svg 
            className="w-16 h-16 mx-auto mb-4 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
          <p className="text-gray-400 text-lg mb-2">Building Your Network Map</p>
          <p className="text-gray-500 text-sm">
            Connect your platforms and wait 30 days to collect customer journey data
          </p>
        </div>
      )}
    </div>
  );
}