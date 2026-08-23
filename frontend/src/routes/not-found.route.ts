import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import { NotFoundPage } from "../pages/NotFoundPage";

/**
 * Catch-all "not found" route.
 * This must be the LAST child in the route tree so it only matches
 * when no other route does.
 */
export const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFoundPage,
});
