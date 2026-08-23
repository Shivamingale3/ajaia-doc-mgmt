import { randomUUID } from 'node:crypto';
import { db } from '../../src/infra/db.js';

/**
 * Tests run against the same database as normal development (see
 * tests/global-setup.ts), so every row a test creates must be identifiable
 * as test data and removed afterward — never assume the table is empty, and
 * never truncate it.
 *
 * Addresses are scoped under a domain unique to the process running the
 * suite, so two suite runs (or a suite run alongside a developer's local
 * dev server) can never collide on the same email.
 */
const TEST_RUN_ID = randomUUID();

export function uniqueEmail(label: string): string {
  return `${label}-${randomUUID()}@test-${TEST_RUN_ID}.invalid`;
}

/** Deletes every user this helper created for the given label, if any were. */
export async function cleanupTestUsers(...emails: string[]): Promise<void> {
  if (emails.length === 0) return;

  await db.user.deleteMany({ where: { email: { in: emails } } });
}
