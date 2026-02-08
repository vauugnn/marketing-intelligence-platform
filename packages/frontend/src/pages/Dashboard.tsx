import { Key, useState } from 'react';
import { usePerformance } from '../hooks/useAnalytics';
import SystemMapComponent from '../components/SystemMapComponent';
import { Search, DollarSign, Briefcase, Clock, Bell, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

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

      {/* Top Bar: Search and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time insights into your marketing channels</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-muted/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-background transition-all"
              placeholder="Search tasks, projects, or documents..."
            />
          </div>
          <button className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-background"></span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="glass-card p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 transition-colors">
              <DollarSign className="h-5 w-5" />
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">₱{totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-500 mt-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>+23% from last month</span>
            </div>
          </div>
        </div>

        {/* Spend Card (Styled like "Active Projects") */}
        <div className="glass-card p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Total Spend</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">₱{totalSpend.toLocaleString()}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-500 mt-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>+12% from last month</span>
            </div>
          </div>
        </div>

        {/* ROI Card (Styled like "Pending Tasks") */}
        <div className="glass-card p-6 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Average ROI</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">{avgROI.toFixed(0)}%</h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-500 mt-2">
              <ArrowDownRight className="h-4 w-4" />
              <span>-5% from last month</span>
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
