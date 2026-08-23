import { afterAll } from 'vitest';
import { db } from '../src/infra/db.js';

// Each test file gets its own module registry (isolate: true in
// vitest.config.ts), so each file's `db` import owns a distinct pg.Pool.
// Without closing it, that file's connections and Vitest's own process
// stay open after the file's tests finish.
afterAll(async () => {
  await db.$disconnect();
});
