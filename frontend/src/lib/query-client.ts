import { QueryClient } from '@tanstack/react-query';

/** Singleton, created once outside React so route guards (beforeLoad) can
 * reach the same cache the component tree uses via useQuery. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});
