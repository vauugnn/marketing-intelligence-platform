import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

const STALE_5_MIN = 5 * 60 * 1000;

export function usePerformance() {
  return useQuery({
    queryKey: ['analytics', 'performance'],
    queryFn: api.getPerformance,
    staleTime: STALE_5_MIN,
  });
}

export function useSynergies() {
  return useQuery({
    queryKey: ['analytics', 'synergies'],
    queryFn: api.getSynergies,
    staleTime: STALE_5_MIN,
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['analytics', 'recommendations'],
    queryFn: api.getRecommendations,
    staleTime: STALE_5_MIN,
  });
}

export function useJourneyPatterns() {
  return useQuery({
    queryKey: ['analytics', 'journeys'],
    queryFn: api.getJourneyPatterns,
    staleTime: STALE_5_MIN,
  });
}

export function useChannelRoles() {
  return useQuery({
    queryKey: ['analytics', 'channel-roles'],
    queryFn: api.getChannelRoles,
    staleTime: STALE_5_MIN,
  });
}
