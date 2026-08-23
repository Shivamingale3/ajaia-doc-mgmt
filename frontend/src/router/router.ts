import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routes/route-tree";

/**
 * The application router instance.
 * Created once and passed to <RouterProvider />.
 */
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
