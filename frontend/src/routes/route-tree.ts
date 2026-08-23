import { rootRoute } from './root.route';
import { homeRoute } from './home.route';
import { aboutRoute } from './about.route';
import { loginRoute } from './login.route';
import { registerRoute } from './register.route';
import { documentsRoute } from './documents.route';
import { documentDetailRoute } from './document-detail.route';
import { notFoundRoute } from './not-found.route';

/**
 * Route tree assembly.
 * This is the single place where all routes are composed into a tree.
 * To add a new route:
 *   1. Create a new `<name>.route.ts` file in this folder.
 *   2. Import it here.
 *   3. Add it to the children array (before notFoundRoute).
 */
export const routeTree = rootRoute.addChildren([
  homeRoute,
  aboutRoute,
  loginRoute,
  registerRoute,
  documentsRoute,
  documentDetailRoute,
  notFoundRoute, // Must remain last — catch-all fallback
]);
