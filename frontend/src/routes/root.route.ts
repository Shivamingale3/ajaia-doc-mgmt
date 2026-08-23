import { createRootRoute } from '@tanstack/react-router';
import { RootLayout } from '../layouts/RootLayout';

/**
 * Root route — the top-level layout route.
 * All other routes are children of this route.
 * Its component (RootLayout) renders the app shell with an <Outlet />.
 */
export const rootRoute = createRootRoute({
  component: RootLayout,
});
