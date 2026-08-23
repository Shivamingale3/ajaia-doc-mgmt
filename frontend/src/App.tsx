import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router/router';
import { queryClient } from './lib/query-client';

// Register the router for type safety (side-effect import)
import './types/router.types';

/**
 * App component — sole responsibility is providing the query client and
 * router to the React tree.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
