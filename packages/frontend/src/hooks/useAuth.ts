import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '@shared/types';

const AUTH_QUERY_KEY = ['auth', 'user'] as const;

function mapUser(supabaseUser: { id: string; email?: string; created_at?: string; user_metadata?: Record<string, any> } | null | undefined): AuthUser | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    created_at: supabaseUser.created_at ?? '',
    user_metadata: supabaseUser.user_metadata,
  };
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return mapUser(session?.user ?? null);
    },
    staleTime: Infinity,
    retry: false,
  });

  // Listen for auth state changes (login, logout, token refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queryClient.setQueryData(AUTH_QUERY_KEY, mapUser(session?.user ?? null));
      }
    );
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return mapUser(data.user);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return mapUser(data.user);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutateAsync,
    signupError: signupMutation.error,
    isSigningUp: signupMutation.isPending,
    loginWithGoogle,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
