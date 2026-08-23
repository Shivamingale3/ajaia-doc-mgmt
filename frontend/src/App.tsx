import { RouterProvider } from '@tanstack/react-router';
import { router } from './router/router';

// Register the router for type safety (side-effect import)
import './types/router.types';

/**
 * App component — sole responsibility is providing the router to the React tree.
 */
function App() {
  return <RouterProvider router={router} />;
}

export default App;
