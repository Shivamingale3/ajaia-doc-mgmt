import type { router } from '../router/router';

/**
 * Module augmentation for TanStack Router.
 * This tells TypeScript about the shape of our router so that
 * hooks like useNavigate, useParams, etc. are fully type-safe.
 */
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
