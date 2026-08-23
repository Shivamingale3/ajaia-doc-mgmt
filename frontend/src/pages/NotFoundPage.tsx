import { Link } from '@tanstack/react-router';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * 404 Not Found page component.
 */
export function NotFoundPage() {
  return (
    <div id="not-found-page">
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to={ROUTE_PATHS.HOME}>Go back home</Link>
    </div>
  );
}
