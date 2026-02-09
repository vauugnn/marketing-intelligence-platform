import { useMemo } from 'react';
import type { ChannelPerformance } from '@shared/types';
import { useDashboardPreferences } from '../stores/useDashboardPreferences';

export function useFilteredChannels(channels: ChannelPerformance[]): ChannelPerformance[] {
  const visibleChannels = useDashboardPreferences((s) => s.visibleChannels);

  return useMemo(() => {
    if (!visibleChannels) return channels;
    return channels.filter((ch) => visibleChannels.includes(ch.channel));
  }, [channels, visibleChannels]);
}
