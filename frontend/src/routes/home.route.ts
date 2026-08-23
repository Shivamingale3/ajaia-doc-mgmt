import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { HomePage } from '../pages/HomePage';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * Home route — renders at "/".
 */
export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.HOME,
  component: HomePage,
});
