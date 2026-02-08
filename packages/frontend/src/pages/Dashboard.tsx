import { Key, useState } from 'react';
import { usePerformance } from '../hooks/useAnalytics';
import SystemMapComponent from '../components/SystemMapComponent';
import { ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const { data: channels = [], isLoading: loading, error, refetch } = usePerformance();
  const [mapExpanded, setMapExpanded] = useState(false);

  // Calculate metrics
  const totalRevenue = channels.reduce((sum: number, ch: { revenue: number }) => sum + ch.revenue, 0);
  const totalSpend = channels.reduce((sum: number, ch: { spend: number }) => sum + ch.spend, 0);
  // We'll use "Active Projects" and "Pending Tasks" placeholders to match the design's *layout*, 
  // but populate them with our available data where it makes sense, or keep the design's specific metrics 
  // if we can't map them. 
  // The user asked to "keep the header text" and "follow the design".
  // The design has: Revenue, Active Projects, Pending Tasks.
  // We have: Revenue, Spend, ROI.
  // I will map:
  // Revenue -> Revenue Card
  // Spend -> Active Projects Card (visually, but label it "Total Spend" to be accurate to data)
  // ROI -> Pending Tasks Card (visually, but label it "Average ROI" to be accurate to data)

  const avgROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 p-8">
      <style>{`
        .glass-card {
           background: hsl(var(--card));
           border: 1px solid hsl(var(--border) / 0.5);
           border-radius: 1rem;
        }
       `}</style>

      {/* Top Bar: Header Only (Search/Bell removed) */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time insights into your marketing channels</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card - Orange Gradient */}
        <div className="rounded-2xl p-6 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          {/* Abstract Circle Decoration */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">Total Revenue</div>
              <h3 className="text-4xl font-bold">₱{totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="text-sm font-medium opacity-90 mt-4">
              +23% from last month
            </div>
          </div>
        </div>

        {/* Spend Card - Peach/Orange Gradient (to stay in Blue/Orange theme but distinct) */}
        <div className="rounded-2xl p-6 shadow-lg bg-gradient-to-br from-orange-300 to-orange-400 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          {/* Abstract Circle Decoration */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1 text-orange-950/70">Total Spend</div>
              <h3 className="text-4xl font-bold text-white">₱{totalSpend.toLocaleString()}</h3>
            </div>
            <div className="text-sm font-medium opacity-90 mt-4 text-white">
              +12% from last month
            </div>
          </div>
        </div>

        {/* ROI Card - Blue Gradient (Replacing Purple) */}
        <div className="rounded-2xl p-6 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          {/* Abstract Circle Decoration */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">Average ROI</div>
              <h3 className="text-4xl font-bold">{avgROI.toFixed(0)}%</h3>
            </div>
            <div className="text-sm font-medium opacity-90 mt-4">
              -5% from last month
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Channel Performance Table */}
        <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-border/50 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-foreground">Channel Performance</h3>
              <p className="text-sm text-muted-foreground mt-1">Track revenue, spend, and ROI across platforms</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0">
            {error ? (
              <div className="h-full flex items-center justify-center flex-col gap-4">
                <p className="text-destructive">{error.message}</p>
                <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Retry</button>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-muted-foreground border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left uppercase tracking-wider">Channel</th>
                    <th className="px-6 py-4 text-right uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-4 text-right uppercase tracking-wider">Spend</th>
                    <th className="px-6 py-4 text-right uppercase tracking-wider">ROI</th>
                    <th className="px-6 py-4 text-right uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {channels.map((channel: any, idx: Key) => (
                    <tr key={idx} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{channel.channel}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm">
                        <span className="text-green-500">₱{channel.revenue.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-muted-foreground">
                        ₱{channel.spend.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-medium">
                        {channel.roi === null ? '∞' : <span className={channel.roi < 0 ? 'text-red-500' : ''}>{Math.round(channel.roi)}%</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`
                          inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium w-28
                          ${channel.performance_rating === 'exceptional' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            channel.performance_rating === 'excellent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              channel.performance_rating === 'satisfactory' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-500 border border-red-500/20'
                          }
                        `}>
                          {channel.performance_rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* System Map */}
        <div className="lg:col-span-1 glass-card overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-border/50 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-foreground">System Map</h3>
              <p className="text-sm text-muted-foreground mt-1">Platform relationships</p>
            </div>
            <button
              onClick={() => setMapExpanded(true)}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 bg-muted/20 relative p-4">
            <SystemMapComponent
              channels={channels}
              isExpanded={mapExpanded}
              onToggleExpand={setMapExpanded}
            />
          </div>
        </div>
      </div>

      {/* Expanded Map Overlay */}
      {mapExpanded && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity" onClick={() => setMapExpanded(false)}>
          <div className="absolute inset-4 md:inset-10 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <SystemMapComponent
              channels={channels}
              isExpanded={true}
              onToggleExpand={setMapExpanded}
            />
          </div>
        </div>
      )}
    </div>
  );
}
