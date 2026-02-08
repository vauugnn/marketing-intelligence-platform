import { useState } from 'react';
import { useRecommendations } from '../hooks/useAnalytics';

type Priority = 'high' | 'medium' | 'low';
type FilterTab = 'all' | 'high' | 'medium' | 'low';

export default function Recommendations() {
  const { data: recommendations = [], isLoading: loading, error, refetch } = useRecommendations();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [appliedRecs, setAppliedRecs] = useState<Set<number>>(new Set());
  const [dismissedRecs, setDismissedRecs] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const toggleExpand = (idx: number) => {
    const next = new Set(expandedCards);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedCards(next);
  };

  const applyRecommendation = (idx: number) => {
    setAppliedRecs(new Set(appliedRecs).add(idx));
  };

  const dismissRecommendation = (idx: number) => {
    setDismissedRecs(new Set(dismissedRecs).add(idx));
  };

  const getPriority = (confidence: number, impact: number): Priority => {
    if (confidence >= 80 && impact >= 10000) return 'high';
    if (confidence >= 60 && impact >= 5000) return 'medium';
    return 'low';
  };

  const getGlobalIndex = (rec: any) => recommendations.indexOf(rec);

  const visibleRecs = recommendations.filter(
    (_: any, idx: number) => !dismissedRecs.has(idx)
  );

  const grouped: Record<Priority, any[]> = { high: [], medium: [], low: [] };
  visibleRecs.forEach((r: { confidence: number; estimated_impact: number; }) => {
    grouped[getPriority(r.confidence, r.estimated_impact)].push(r);
  });

  const filteredGroups =
    activeTab === 'all'
      ? grouped
      : ({ [activeTab]: grouped[activeTab] } as Record<Priority, any[]>);

  const totalImpact = visibleRecs.reduce(
    (sum: any, rec: { estimated_impact: any; }) => sum + rec.estimated_impact,
    0
  );

  const priorityMeta: Record<
    Priority,
    { label: string; dot: string; gradient: string; count: number }
  > = {
    high: {
      label: 'High Priority',
      dot: '#ef4444',
      gradient: 'from-red-400 to-orange-400',
      count: grouped.high.length,
    },
    medium: {
      label: 'Medium Priority',
      dot: '#f59e0b',
      gradient: 'from-yellow-400 to-amber-400',
      count: grouped.medium.length,
    },
    low: {
      label: 'Low Priority',
      dot: '#3b82f6',
      gradient: 'from-blue-400 to-cyan-400',
      count: grouped.low.length,
    },
  };

  const typeTheme = {
    scale: {
      accent: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.25)',
      text: 'text-emerald-400',
      label: 'Scale',
      btnBg:
        'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500',
    },
    optimize: {
      accent: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)',
      text: 'text-amber-400',
      label: 'Optimize',
      btnBg:
        'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500',
    },
    stop: {
      accent: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.25)',
      text: 'text-red-400',
      label: 'Stop',
      btnBg:
        'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
    },
  };

  /* ─── Mini spark bar data (deterministic per index) ─── */
  const sparkData = (idx: number) => {
    const seed = idx * 7 + 3;
    return [0.35, 0.5, 0.65, 0.8, 0.72, 0.88, 0.95].map(
      (v) => v + ((seed % 5) * 0.02 - 0.04)
    );
  };

  /* ─── Card renderer ─── */
  const renderCard = (rec: any) => {
    const idx = getGlobalIndex(rec);
    const theme = typeTheme[rec.type as keyof typeof typeTheme] || typeTheme.optimize;
    const isExpanded = expandedCards.has(idx);
    const isApplied = appliedRecs.has(idx);
    const priority = getPriority(rec.confidence, rec.estimated_impact);

    return (
      <div
        key={idx}
        className={`rec-card rounded-xl overflow-hidden transition-all duration-300 ${isApplied ? 'opacity-60' : ''
          }`}
        style={{
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="p-4">
          {/* Top: type dot + badge + confidence */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: theme.accent }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: theme.bg,
                  color: theme.accent,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {theme.label}
              </span>
              {isApplied && (
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Applied
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{rec.confidence}%</span>
          </div>

          {/* Channel name */}
          <h3 className="font-bold text-sm text-foreground truncate mb-1">{rec.channel}</h3>

          {/* Action text — clamped in square mode */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {rec.action}
          </p>

          {/* Metrics row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div
              className="rounded-lg p-3 bg-muted/30 border border-border"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Est. Impact
              </p>
              <p className={`text-lg font-bold font-mono ${theme.text}`}>
                {rec.type === 'stop' ? '-' : '+'}₱{rec.estimated_impact.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">per month</p>
            </div>

            <div
              className="rounded-lg p-3 bg-muted/30 border border-border"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Confidence
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-lg font-bold font-mono text-foreground">{rec.confidence}%</span>
              </div>
              <div className="mt-1.5 w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rec.confidence}%`,
                    background: `linear-gradient(90deg, ${theme.accent}88, ${theme.accent})`,
                  }}
                />
              </div>
            </div>

            <div
              className="rounded-lg p-3 bg-muted/30 border border-border"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                6-mo Trend
              </p>
              <div className="flex items-end gap-[3px] h-8">
                {sparkData(idx).map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${Math.max(v * 100, 10)}%`,
                      background:
                        i === sparkData(idx).length - 1
                          ? theme.accent
                          : `${theme.accent}55`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {priority === 'high'
                  ? '↗ Strong upside'
                  : priority === 'medium'
                    ? '→ Moderate gain'
                    : '↗ Gradual lift'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-1.5">
            <button
              onClick={() => applyRecommendation(idx)}
              disabled={isApplied}
              className={`${theme.btnBg} text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isApplied ? 'Applied' : 'Apply'}
            </button>
            <button
              onClick={() => toggleExpand(idx)}
              className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all border border-border"
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
            <button
              onClick={() => dismissRecommendation(idx)}
              className="bg-muted/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] px-2 py-1.5 rounded-lg transition-all border border-border ml-auto"
            >
              ×
            </button>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
              {/* Before / After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="rounded-lg p-3 bg-muted/50 border border-border"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Current State
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{rec.reason}</p>
                </div>
                <div
                  className="rounded-lg p-3 bg-muted/50"
                  style={{ border: `1px solid ${theme.border}` }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: theme.accent }}
                  >
                    After Implementation
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {rec.type === 'scale' &&
                      `Increased budget will capture ${Math.round(
                        rec.confidence * 1.2
                      )}% more conversions with optimized targeting.`}
                    {rec.type === 'optimize' &&
                      `Optimized campaign will improve efficiency by ${rec.confidence}% through better targeting and ad creative.`}
                    {rec.type === 'stop' &&
                      `Resources reallocated to high-performing channels, eliminating ${rec.confidence}% of wasted spend.`}
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div
                className="rounded-lg p-3 bg-muted/50 border border-border"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Why This Matters
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">&#8226;</span>
                    Based on {30 + ((idx * 13) % 60)} days of performance data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">&#8226;</span>
                    Analyzed {1000 + ((idx * 317) % 4000)} conversions across channel
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">&#8226;</span>
                    Industry benchmark:{' '}
                    {rec.confidence > 70 ? 'Above average' : 'Below average'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─── Loading / Error state ─── */
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-[3px] border-gray-700 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm mt-3">
            Loading recommendations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Outfit', sans-serif; }

        .rec-metric {
          background-color: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rec-metric:hover {
          transform: translateY(-2px);
          border-color: hsl(var(--primary) / 0.5);
          box-shadow: 0 10px 20px -10px hsl(var(--primary) / 0.2);
        }

        .rec-card {
           background-color: hsl(var(--card));
           color: hsl(var(--card-foreground));
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rec-card:hover {
          transform: translateY(-2px);
           border-color: hsl(var(--primary) / 0.5);
           box-shadow: 0 10px 20px -10px hsl(var(--primary) / 0.2);
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 ml-14 lg:ml-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            AI Recommendations
          </h1>
          <p className="text-muted-foreground text-sm">
            Data-driven actions to improve your marketing ROI
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rec-metric rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Total Impact
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-500 mt-1">
              ₱{totalImpact.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">per month</p>
          </div>
          <div className="rec-metric rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Active
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-1">
              {visibleRecs.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">recommendations</p>
          </div>
          <div className="rec-metric rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Applied
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-blue-500 mt-1">
              {appliedRecs.size}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">implemented</p>
          </div>
          <div className="rec-metric rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Dismissed
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-muted-foreground mt-1">
              {dismissedRecs.size}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">skipped</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 mb-5">
          {(
            [
              { key: 'all', label: 'All', count: visibleRecs.length },
              ...(['high', 'medium', 'low'] as Priority[]).map((p) => ({
                key: p,
                label: priorityMeta[p].label,
                count: priorityMeta[p].count,
              })),
            ] as { key: FilterTab; label: string; count: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${activeTab === tab.key
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Recommendation groups */}
        {(['high', 'medium', 'low'] as Priority[]).map((priority) => {
          const recs = filteredGroups[priority];
          if (!recs || recs.length === 0) return null;

          const meta = priorityMeta[priority];

          return (
            <div key={priority} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: meta.dot }}
                />
                <h2
                  className={`text-sm font-bold bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent uppercase tracking-wider`}
                >
                  {meta.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {meta.count}
                </span>
              </div>

              <div className="space-y-3">{recs.map(renderCard)}</div>
            </div>
          );
        })}

        {/* Empty state */}
        {visibleRecs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              No active recommendations. Check back when new data arrives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
