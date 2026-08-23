import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { DocumentsListPage } from '../pages/DocumentsListPage';
import { ROUTE_PATHS } from '../constants/route-paths.constants';
import { requireAuth } from '../router/guards';

/**
 * Documents list route — renders at "/documents". Protected: redirects to
 * /login if there's no valid session.
 */
export const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.DOCUMENTS,
  beforeLoad: ({ context }) => requireAuth(context.queryClient),
  component: DocumentsListPage,
});
