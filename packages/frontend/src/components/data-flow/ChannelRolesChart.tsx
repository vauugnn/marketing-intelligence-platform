import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChannelRole } from '@shared/types';

interface Props {
  roles: ChannelRole[];
  isLoading: boolean;
}

const roleColors = {
  introducer_count: '#3b82f6',
  supporter_count: '#f59e0b',
  closer_count: '#10b981',
  solo_conversions: '#6b7280',
};

const roleLabels: Record<string, string> = {
  introducer_count: 'Introducer',
  supporter_count: 'Supporter',
  closer_count: 'Closer',
  solo_conversions: 'Solo',
};

const primaryRoleColors: Record<string, string> = {
  introducer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  supporter: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  closer: 'bg-green-500/20 text-green-400 border-green-500/30',
  isolated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
          {roleLabels[p.dataKey]}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function ChannelRolesChart({ roles, isLoading }: Props) {
  const data = roles.map(r => ({
    channel: r.channel.charAt(0).toUpperCase() + r.channel.slice(1),
    introducer_count: r.introducer_count,
    supporter_count: r.supporter_count,
    closer_count: r.closer_count,
    solo_conversions: r.solo_conversions,
    primary_role: r.primary_role,
  }));

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ height: '420px' }}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold">Channel Roles</h3>
        <p className="text-gray-400 text-xs mt-0.5">How each channel contributes to the conversion funnel</p>
      </div>

      <div className="p-4" style={{ height: 'calc(100% - 72px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block w-10 h-10 border-3 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-4">
            No channel role data available yet. Connect platforms and collect conversion data to see funnel roles.
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Primary role badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {data.map(d => (
                <span
                  key={d.channel}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${primaryRoleColors[d.primary_role] || primaryRoleColors.isolated}`}
                >
                  {d.channel}: {d.primary_role}
                </span>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="channel"
                    type="category"
                    tick={{ fill: '#d1d5db', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend
                    wrapperStyle={{ paddingTop: 4, fontSize: 11 }}
                    formatter={(value: string) => (
                      <span className="text-gray-300 text-xs">{roleLabels[value] || value}</span>
                    )}
                  />
                  <Bar dataKey="introducer_count" stackId="a" fill={roleColors.introducer_count} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="supporter_count" stackId="a" fill={roleColors.supporter_count} />
                  <Bar dataKey="closer_count" stackId="a" fill={roleColors.closer_count} />
                  <Bar dataKey="solo_conversions" stackId="a" fill={roleColors.solo_conversions} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
