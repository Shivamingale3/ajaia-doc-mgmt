import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set sane test env BEFORE any test module imports trigger env.config.ts.
// dotenv's config() does not override values already on process.env,
// so these win over whatever is in the repo-root .env.
process.env.DATABASE_URL ??= `file:${path.resolve(__dirname, 'tests/test.db')}`;
process.env.APP_ENV ??= 'test';
process.env.APP_PORT ??= '0';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Run test files sequentially (no parallel) so each PrismaClient
    // gets exclusive access to the shared SQLite file. Without this,
    // Vitest 4 runs files concurrently by default → libsql adapter
    // "Operation has timed out" errors on shared file.
    fileParallelism: false,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
