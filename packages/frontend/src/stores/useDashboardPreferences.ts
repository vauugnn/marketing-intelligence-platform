import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateRangePreset = '7d' | '30d' | '90d';
export type MetricView = 'revenue' | 'conversions';

interface DashboardPreferences {
  dateRange: DateRangePreset;
  metricView: MetricView;
  visibleChannels: string[] | null; // null = show all

  setDateRange: (range: DateRangePreset) => void;
  setMetricView: (view: MetricView) => void;
  setVisibleChannels: (channels: string[] | null) => void;
}

export const useDashboardPreferences = create<DashboardPreferences>()(
  persist(
    (set) => ({
      dateRange: '30d',
      metricView: 'revenue',
      visibleChannels: null,

      setDateRange: (range) => set({ dateRange: range }),
      setMetricView: (view) => set({ metricView: view }),
      setVisibleChannels: (channels) => set({ visibleChannels: channels }),
    }),
    { name: 'dashboard-preferences' }
  )
);

export function presetToDateParams(preset: DateRangePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}
