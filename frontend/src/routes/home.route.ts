import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * Home route — "/" has no content of its own, it just forwards to the
 * documents list. That route's own auth guard sends signed-out visitors on
 * to /login, so this doesn't need to duplicate that check.
 */
export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.HOME,
  beforeLoad: () => {
    throw redirect({ to: ROUTE_PATHS.DOCUMENTS });
  },
});
