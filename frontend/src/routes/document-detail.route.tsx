import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { DocumentEditorPage } from '../pages/DocumentEditorPage';
import { ROUTE_PATHS } from '../constants/route-paths.constants';
import { requireAuth } from '../router/guards';

/**
 * Document editor route — renders at "/documents/$id". Protected: redirects
 * to /login if there's no valid session.
 */
export const documentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.DOCUMENT_DETAIL,
  beforeLoad: ({ context }) => requireAuth(context.queryClient),
  component: DocumentDetailRouteComponent,
});

function DocumentDetailRouteComponent() {
  const { id } = documentDetailRoute.useParams();
  return <DocumentEditorPage id={id} />;
}
