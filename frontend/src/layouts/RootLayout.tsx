import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '../constants/route-paths.constants';
import { meQueryOptions, useLogoutMutation } from '../queries/auth.queries';

/**
 * Root layout component — the app shell.
 * Renders a navigation bar and an <Outlet /> where child routes mount.
 *
 * Mounted for every route, including /login and /register, so the `me`
 * query is read with `retry: false` (see auth.queries.ts) — a 401 there just
 * means "signed out," not an error to surface.
 */
export function RootLayout() {
  const navigate = useNavigate();
  const { data: user } = useQuery(meQueryOptions);
  const logoutMutation = useLogoutMutation();

  function handleLogout(): void {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: ROUTE_PATHS.LOGIN });
      },
    });
  }

  return (
    <div id="app-shell" className="min-h-screen">
      <nav
        id="main-nav"
        className="flex items-center justify-between border-b border-border px-6 py-3"
      >
        <Link to={ROUTE_PATHS.DOCUMENTS} className="font-semibold">
          Documents
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to={ROUTE_PATHS.LOGIN}>
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to={ROUTE_PATHS.REGISTER}>
              <Button size="sm">Register</Button>
            </Link>
          </div>
        )}
      </nav>

      <main id="page-content" className="px-6">
        <Outlet />
      </main>
    </div>
  );
}
