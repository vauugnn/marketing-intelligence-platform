import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChannelPerformance } from '@shared/types';

interface Props {
  channels: ChannelPerformance[];
  isLoading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value ?? 0;
  const spend = payload.find((p: any) => p.dataKey === 'spend')?.value ?? 0;
  const roi = spend > 0 ? ((revenue - spend) / spend * 100).toFixed(0) : '∞';

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-2">{label}</p>
      <p className="text-green-400 text-xs">Revenue: ₱{revenue.toLocaleString()}</p>
      <p className="text-orange-400 text-xs">Spend: ₱{spend.toLocaleString()}</p>
      <p className="text-blue-400 text-xs font-semibold mt-1">ROI: {roi === '∞' ? <span className="text-sm font-semibold">∞</span> : `${roi}%`}</p>
    </div>
  );
}

export default function RevenueSpendChart({ channels, isLoading }: Props) {
  const data = channels.map(ch => ({
    channel: ch.channel,
    revenue: ch.revenue,
    spend: ch.spend,
  }));

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ height: '420px' }}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold">Revenue vs Spend</h3>
        <p className="text-gray-400 text-xs mt-0.5">Compare revenue and spend across channels</p>
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
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="channel"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                formatter={(value: string) => <span className="text-gray-300 text-xs capitalize">{value}</span>}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="spend" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
