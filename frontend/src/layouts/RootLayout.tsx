import { Link, Outlet } from '@tanstack/react-router';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * Root layout component — the app shell.
 * Renders a navigation bar and an <Outlet /> where child routes mount.
 */
export function RootLayout() {
  return (
    <div id="app-shell">
      <nav id="main-nav">
        <Link to={ROUTE_PATHS.HOME} activeProps={{ className: 'active' }}>
          Home
        </Link>
        <Link to={ROUTE_PATHS.ABOUT} activeProps={{ className: 'active' }}>
          About
        </Link>
      </nav>

      <main id="page-content">
        <Outlet />
      </main>
    </div>
  );
}
