/**
 * Runs once before the whole suite, in the main Vitest process — separate
 * from the per-file worker contexts that setupFiles run in, which is why it
 * needs its own dynamic import of `db` rather than sharing one with the test
 * files.
 *
 * Tests run against the same Postgres instance as normal development
 * (DATABASE_URL from .env, loaded by src/config/env.config.ts on import).
 * This setup step only confirms the schema is actually there; it never
 * creates or migrates it, so a developer stays in control of when their
 * database's shape changes.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const { db } = await import('../src/infra/db.js');

  try {
    await db.user.count();
  } catch (error) {
    console.error(
      '\nTests could not query the `users` table on the database in DATABASE_URL ' +
        '(backend/.env). Confirm Postgres is reachable and the schema has been applied:\n\n' +
        '  npm run db:push\n',
    );
    throw error;
  }

  return async () => {
    await db.$disconnect();
  };
}
