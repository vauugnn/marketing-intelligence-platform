import { useState, useRef, useEffect } from 'react';
import {
  useDashboardPreferences,
  type DateRangePreset,
  type MetricView,
} from '../stores/useDashboardPreferences';

interface DashboardControlsProps {
  channels?: string[];
  showMetricToggle?: boolean;
  showChannelFilter?: boolean;
}

const DATE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const METRIC_OPTIONS: { value: MetricView; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversions', label: 'Conversions' },
];

export default function DashboardControls({
  channels,
  showMetricToggle = true,
  showChannelFilter = true,
}: DashboardControlsProps) {
  const { dateRange, setDateRange, metricView, setMetricView, visibleChannels, setVisibleChannels } =
    useDashboardPreferences();

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen]);

  const allChannels = channels ?? [];
  const selected = visibleChannels ?? allChannels;
  const allSelected = !visibleChannels || visibleChannels.length === allChannels.length;

  function toggleChannel(ch: string) {
    if (!visibleChannels) {
      setVisibleChannels(allChannels.filter((c) => c !== ch));
    } else if (visibleChannels.includes(ch)) {
      const next = visibleChannels.filter((c) => c !== ch);
      setVisibleChannels(next.length === 0 ? null : next);
    } else {
      const next = [...visibleChannels, ch];
      setVisibleChannels(next.length === allChannels.length ? null : next);
    }
  }

  function toggleAll() {
    if (allSelected) {
      setVisibleChannels([allChannels[0]]);
    } else {
      setVisibleChannels(null);
    }
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Segmented Pill */}
      <div className="inline-flex rounded-lg bg-muted/50 border border-border p-0.5">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              dateRange === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Metric View Toggle */}
      {showMetricToggle && (
        <div className="inline-flex rounded-lg bg-muted/50 border border-border p-0.5">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMetricView(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                metricView === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Channel Filter */}
      {showChannelFilter && allChannels.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              !allSelected
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Channels
            {!allSelected && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {selected.length}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={toggleAll}
                className="w-full text-left px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-b border-border"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              {allChannels.map((ch) => (
                <label
                  key={ch}
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="rounded border-border text-primary focus:ring-primary/20 h-3.5 w-3.5"
                  />
                  <span className="text-foreground font-medium">{capitalize(ch)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
