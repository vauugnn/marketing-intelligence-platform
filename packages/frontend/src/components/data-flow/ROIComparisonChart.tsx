import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from 'recharts';
import type { ChannelPerformance } from '@shared/types';

interface Props {
  channels: ChannelPerformance[];
  isLoading: boolean;
}

const performanceColors: Record<string, string> = {
  exceptional: '#10b981',
  excellent: '#3b82f6',
  satisfactory: '#f59e0b',
  poor: '#f97316',
  failing: '#ef4444',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-2">{d.channel}</p>
      <p className="text-orange-400 text-xs">Spend: ₱{d.spend.toLocaleString()}</p>
      <p className="text-blue-400 text-xs">ROI: {d.roi === null ? '∞' : `${Math.round(d.roi)}%`}</p>
      <p className="text-green-400 text-xs">Revenue: ₱{d.revenue.toLocaleString()}</p>
      <p className="text-gray-400 text-xs capitalize mt-1">Rating: {d.performance_rating}</p>
    </div>
  );
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const color = performanceColors[payload.performance_rating] || '#64748b';
  const size = Math.max(8, Math.min(20, payload.revenue / 20000));

  return (
    <g>
      <circle cx={cx} cy={cy} r={size + 4} fill={color} opacity={0.2} />
      <circle cx={cx} cy={cy} r={size} fill={color} opacity={0.8} stroke={color} strokeWidth={1} />
      <text x={cx} y={cy - size - 6} textAnchor="middle" fill="#d1d5db" fontSize={10}>
        {payload.channel}
      </text>
    </g>
  );
}

export default function ROIComparisonChart({ channels, isLoading }: Props) {
  const data = channels.map(ch => ({
    channel: ch.channel,
    spend: ch.spend,
    roi: ch.roi ?? 0,
    revenue: ch.revenue,
    performance_rating: ch.performance_rating,
  }));

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ height: '420px' }}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold">ROI vs Spend</h3>
        <p className="text-gray-400 text-xs mt-0.5">Bubble size = revenue volume, color = performance rating</p>
      </div>

      <div className="p-4 h-[calc(100%-72px)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No performance data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="spend"
                type="number"
                name="Spend"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                label={{ value: 'Spend', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 11 }}
              />
              <YAxis
                dataKey="roi"
                type="number"
                name="ROI"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'ROI %', angle: -90, position: 'insideLeft', offset: 10, fill: '#6b7280', fontSize: 11 }}
              />
              <ZAxis dataKey="revenue" range={[100, 1000]} domain={[0, maxRevenue]} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="6 4" label={{ value: 'Break-even', fill: '#6b7280', fontSize: 10, position: 'right' }} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={data} shape={<CustomDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
