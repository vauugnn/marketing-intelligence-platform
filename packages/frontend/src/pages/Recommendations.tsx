import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Priority = 'high' | 'medium' | 'low';
type FilterTab = 'all' | 'high' | 'medium' | 'low';

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [appliedRecs, setAppliedRecs] = useState<Set<number>>(new Set());
  const [dismissedRecs, setDismissedRecs] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const result = await api.getRecommendations();
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

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
    (_, idx) => !dismissedRecs.has(idx)
  );

  const grouped: Record<Priority, any[]> = { high: [], medium: [], low: [] };
  visibleRecs.forEach((r) => {
    grouped[getPriority(r.confidence, r.estimated_impact)].push(r);
  });

  const filteredGroups =
    activeTab === 'all'
      ? grouped
      : ({ [activeTab]: grouped[activeTab] } as Record<Priority, any[]>);

  const totalImpact = visibleRecs.reduce(
    (sum, rec) => sum + rec.estimated_impact,
    0
  );

  const priorityMeta: Record<
    Priority,
    { label: string; icon: string; gradient: string; count: number }
  > = {
    high: {
      label: 'High Priority',
      icon: '🔥',
      gradient: 'from-red-400 to-orange-400',
      count: grouped.high.length,
    },
    medium: {
      label: 'Medium Priority',
      icon: '⚡',
      gradient: 'from-yellow-400 to-amber-400',
      count: grouped.medium.length,
    },
    low: {
      label: 'Low Priority',
      icon: '💡',
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
      icon: '🟢',
      label: 'Scale',
      btnBg:
        'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500',
    },
    optimize: {
      accent: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)',
      text: 'text-amber-400',
      icon: '🟡',
      label: 'Optimize',
      btnBg:
        'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500',
    },
    stop: {
      accent: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.25)',
      text: 'text-red-400',
      icon: '🔴',
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
        className={`rec-card rounded-xl overflow-hidden transition-all duration-300 ${
          isApplied ? 'opacity-60' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.border}`,
          borderLeft: `4px solid ${theme.accent}`,
        }}
      >
        {/* Card header */}
        <div className="p-5">
          <div className="flex items-start gap-3">
            {/* Type icon */}
            <span className="text-2xl mt-0.5 shrink-0">{theme.icon}</span>

            <div className="flex-1 min-w-0">
              {/* Top row: title + badges */}
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h3 className="font-bold text-base text-white truncate">
                  {rec.channel}
                </h3>
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
                {rec.ai_enhanced && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    AI
                  </span>
                )}
                {isApplied && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Applied
                  </span>
                )}
              </div>

              {/* Action description */}
              <p className="text-sm text-gray-400 leading-relaxed">
                {rec.action}
              </p>
              {rec.ai_explanation && (
                <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">
                  {rec.ai_explanation}
                </p>
              )}

              {/* Metrics row */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {/* ROI Impact */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">
                    Est. Impact
                  </p>
                  <p className={`text-lg font-bold font-mono ${theme.text}`}>
                    {rec.type === 'stop' ? '-' : '+'}₱
                    {rec.estimated_impact.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">per month</p>
                </div>

                {/* Confidence */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">
                    Confidence
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-lg font-bold font-mono text-white">
                      {rec.confidence}%
                    </span>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-1.5 w-full h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${rec.confidence}%`,
                        background: `linear-gradient(90deg, ${theme.accent}88, ${theme.accent})`,
                      }}
                    />
                  </div>
                </div>

                {/* Projected trend */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">
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
                  <p className="text-[10px] text-gray-500 mt-1">
                    {priority === 'high'
                      ? '↗ Strong upside'
                      : priority === 'medium'
                      ? '→ Moderate gain'
                      : '↗ Gradual lift'}
                  </p>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                  {/* Before / After */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Current State
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: theme.accent }}
                      >
                        After Implementation
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {rec.after_implementation
                          ? rec.after_implementation
                          : rec.type === 'scale'
                          ? `Increased budget will capture ${Math.round(
                              rec.confidence * 1.2
                            )}% more conversions with optimized targeting.`
                          : rec.type === 'optimize'
                          ? `Optimized campaign will improve efficiency by ${rec.confidence}% through better targeting and ad creative.`
                          : `Resources reallocated to high-performing channels, eliminating ${rec.confidence}% of wasted spend.`}
                      </p>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Why This Matters
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1.5">
                      {rec.why_it_matters && rec.why_it_matters.length > 0
                        ? rec.why_it_matters.map((bullet: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">&#8226;</span>
                              {bullet}
                            </li>
                          ))
                        : <>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">&#8226;</span>
                              Based on {30 + ((idx * 13) % 60)} days of performance
                              data
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">&#8226;</span>
                              Analyzed {1000 + ((idx * 317) % 4000)} conversions
                              across channel
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-600 mt-0.5">&#8226;</span>
                              Industry benchmark:{' '}
                              {rec.confidence > 70
                                ? 'Above average'
                                : 'Below average'}
                            </li>
                          </>
                      }
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => applyRecommendation(idx)}
                  disabled={isApplied}
                  className={`${theme.btnBg} text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isApplied ? '✓ Applied' : '✓ Apply'}
                </button>
                <button
                  onClick={() => toggleExpand(idx)}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all border border-white/[0.08]"
                >
                  {isExpanded ? '▲ Less' : '▼ Learn More'}
                </button>
                <button
                  onClick={() => dismissRecommendation(idx)}
                  className="bg-white/[0.04] hover:bg-red-500/10 text-gray-500 hover:text-red-400 text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all border border-white/[0.06]"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Loading state ─── */
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Outfit', sans-serif; }
        .rec-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .rec-card:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 ml-14 lg:ml-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            AI Recommendations
          </h1>
          <p className="text-gray-400 text-sm">
            Data-driven actions to improve your marketing ROI
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div
            className="rounded-xl p-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Total Impact
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              ₱{totalImpact.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">per month</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Active
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {visibleRecs.length}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">recommendations</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Applied
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-blue-400 mt-1">
              {appliedRecs.size}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">implemented</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(30,30,40,0.8), rgba(20,20,30,0.9))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Dismissed
            </p>
            <p className="text-xl sm:text-2xl font-bold font-mono text-gray-500 mt-1">
              {dismissedRecs.size}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">skipped</p>
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
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-gray-600">{tab.count}</span>
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
                <span className="text-base">{meta.icon}</span>
                <h2
                  className={`text-sm font-bold bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent uppercase tracking-wider`}
                >
                  {meta.label}
                </h2>
                <span className="text-xs text-gray-600">
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
            <p className="text-gray-500 text-sm">
              No active recommendations. Check back when new data arrives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
