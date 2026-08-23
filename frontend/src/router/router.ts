import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routes/route-tree';
import { queryClient } from '../lib/query-client';

/**
 * The application router instance.
 * Created once and passed to <RouterProvider />.
 */
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});
