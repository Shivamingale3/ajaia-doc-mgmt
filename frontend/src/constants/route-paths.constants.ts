/**
 * Centralized route path constants.
 * All route paths are defined here to avoid magic strings throughout the app.
 */
export const ROUTE_PATHS = {
  HOME: '/',
  ABOUT: '/about',
  LOGIN: '/login',
  REGISTER: '/register',
  DOCUMENTS: '/documents',
  DOCUMENT_DETAIL: '/documents/$id',
} as const;
