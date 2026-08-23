import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root.route";
import { ROUTE_PATHS } from "../constants/route-paths.constants";
import { AboutPage } from "../pages/AboutPage";

/**
 * About route — renders at "/about".
 */
export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTE_PATHS.ABOUT,
  component: AboutPage,
});
