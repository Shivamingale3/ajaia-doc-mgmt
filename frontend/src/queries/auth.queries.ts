import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api-client';
import type { PublicUser } from '../types/api.types';

export const meQueryKey = ['auth', 'me'] as const;

/**
 * `retry: false` matters here: this query is what route guards call via
 * `ensureQueryData` to decide whether to redirect to /login. React Query's
 * default retry behavior would delay that decision by several seconds on a
 * guaranteed-to-keep-failing 401.
 */
export const meQueryOptions = queryOptions({
  queryKey: meQueryKey,
  queryFn: () => apiGet<PublicUser>('/auth/me'),
  retry: false,
  staleTime: 60 * 1000,
});

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (input: RegisterInput) => apiPost<PublicUser>('/auth/register', input),
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => apiPost<PublicUser>('/auth/login', input),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<null>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, undefined);
      queryClient.clear();
    },
  });
}
