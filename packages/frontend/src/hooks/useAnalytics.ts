import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';
import { useDashboardPreferences, presetToDateParams } from '../stores/useDashboardPreferences';

const STALE_5_MIN = 5 * 60 * 1000;

function useDateParams() {
  const dateRange = useDashboardPreferences((s) => s.dateRange);
  return { dateRange, dateParams: presetToDateParams(dateRange) };
}

export function usePerformance() {
  const { dateRange, dateParams } = useDateParams();
  return useQuery({
    queryKey: ['analytics', 'performance', dateRange],
    queryFn: () => api.getPerformance(dateParams),
    staleTime: STALE_5_MIN,
  });
}

export function useSynergies() {
  const { dateRange, dateParams } = useDateParams();
  return useQuery({
    queryKey: ['analytics', 'synergies', dateRange],
    queryFn: () => api.getSynergies(dateParams),
    staleTime: STALE_5_MIN,
  });
}

export function useRecommendations() {
  const { dateRange, dateParams } = useDateParams();
  return useQuery({
    queryKey: ['analytics', 'recommendations', dateRange],
    queryFn: () => api.getRecommendations(dateParams),
    staleTime: STALE_5_MIN,
  });
}

export function useJourneyPatterns() {
  const { dateRange, dateParams } = useDateParams();
  return useQuery({
    queryKey: ['analytics', 'journeys', dateRange],
    queryFn: () => api.getJourneyPatterns(dateParams),
    staleTime: STALE_5_MIN,
  });
}

export function useChannelRoles() {
  const { dateRange, dateParams } = useDateParams();
  return useQuery({
    queryKey: ['analytics', 'channel-roles', dateRange],
    queryFn: () => api.getChannelRoles(dateParams),
    staleTime: STALE_5_MIN,
  });
}
