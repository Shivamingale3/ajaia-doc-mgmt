import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { RegisterPage } from '../pages/RegisterPage';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * Register route — renders at "/register".
 */
export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.REGISTER,
  component: RegisterPage,
});
