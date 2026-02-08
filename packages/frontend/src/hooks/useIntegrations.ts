import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useToastStore } from '../components/ui/Toast';

export function usePlatforms() {
  return useQuery({
    queryKey: ['integrations', 'platforms'],
    queryFn: api.getIntegrations,
    refetchInterval: 30_000, // poll every 30s
  });
}

export function usePixel() {
  return useQuery({
    queryKey: ['integrations', 'pixel'],
    queryFn: api.generatePixel,
    staleTime: Infinity, // pixel doesn't change
  });
}

export function useConnectPlatform() {
  const queryClient = useQueryClient();
  const addToast = useToastStore.getState().addToast;

  return useMutation({
    mutationFn: api.connectPlatform,
    onSuccess: (_data, platform) => {
      addToast(`Connection to ${platform} initiated!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error: Error) => {
      addToast(error.message || 'Connection failed', 'error');
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  const addToast = useToastStore.getState().addToast;

  return useMutation({
    mutationFn: api.disconnectPlatform,
    onSuccess: (_data, platform) => {
      addToast(`Disconnected from ${platform}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error: Error) => {
      addToast(error.message || 'Disconnect failed', 'error');
    },
  });
}
