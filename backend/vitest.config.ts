import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set sane test env BEFORE any test module imports trigger env.config.ts.
// dotenv's config() does not override values already on process.env, so this
// wins over whatever APP_ENV is in .env. DATABASE_URL is intentionally left
// alone: tests run against the same Postgres instance as normal development
// (see tests/global-setup.ts and tests/helpers/db.ts for how test data stays
// isolated from it).
process.env.APP_ENV ??= 'test';
process.env.APP_PORT ??= '0';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Test files share one Postgres instance (see tests/global-setup.ts).
    // Running them sequentially keeps each pg.Pool from piling onto the
    // same connection limit and keeps failures easy to attribute to a
    // single file.
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
