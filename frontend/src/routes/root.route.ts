import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { RootLayout } from '../layouts/RootLayout';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Root route — the top-level layout route.
 * All other routes are children of this route.
 * Its component (RootLayout) renders the app shell with an <Outlet />.
 *
 * Carries `queryClient` in context so protected routes' `beforeLoad` can call
 * `context.queryClient.ensureQueryData(meQueryOptions)` to guard on auth
 * state without needing a separate React context/provider for it.
 */
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});
