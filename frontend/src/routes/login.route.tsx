import { createRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { rootRoute } from './root.route';
import { LoginPage } from '../pages/LoginPage';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

const loginSearchSchema = z.object({
  registered: z.boolean().optional(),
});

/**
 * Login route — renders at "/login".
 * `registered=true` is set by RegisterPage after a successful signup, to
 * show a one-time "account created" banner.
 */
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.LOGIN,
  validateSearch: loginSearchSchema,
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const { registered } = loginRoute.useSearch();
  return <LoginPage justRegistered={registered} />;
}
