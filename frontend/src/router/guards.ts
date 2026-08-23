import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { meQueryOptions } from '../queries/auth.queries';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * Shared `beforeLoad` guard for every protected route. `ensureQueryData`
 * reuses the cache — a signed-in user navigating between protected pages
 * doesn't refire `GET /me` on every navigation, only when the cache is stale
 * or empty.
 */
export async function requireAuth(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.ensureQueryData(meQueryOptions);
  } catch {
    throw redirect({ to: ROUTE_PATHS.LOGIN });
  }
}
