import type { AuthenticatedUser } from '../interfaces/auth.interfaces.js';

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by the authenticate middleware. Undefined on public routes,
       * so route handlers behind `authenticate` should still narrow it.
       */
      user?: AuthenticatedUser;
    }
  }
}

export {};
