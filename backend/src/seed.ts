import bcrypt from 'bcryptjs';
import { db } from './infra/db.js';
import { logger } from './utils/logger.js';

/**
 * Demo data for reviewers: two accounts and one document already shared
 * between them, so the sharing flow is visible immediately without first
 * having to register two accounts by hand. Matches the auth service's own
 * bcrypt cost factor (see backend/src/services/auth.service.ts).
 */
const BCRYPT_COST = 12;
const DEMO_PASSWORD = 'DemoPass1!';

const DEMO_USERS = [
  { firstName: 'Alice', lastName: 'Owner', email: 'alice@demo.local' },
  { firstName: 'Bob', lastName: 'Reviewer', email: 'bob@demo.local' },
] as const;

const DEMO_DOCUMENT_TITLE = 'Welcome to the demo';
const DEMO_DOCUMENT_CONTENT =
  '<h1>Welcome</h1>' +
  '<p>This document is <strong>owned by Alice</strong> and <em>shared with Bob</em> — ' +
  'log in as either account to see it from both sides.</p>' +
  '<ul><li>Bold, italic and underline formatting</li><li>Headings</li><li>Bulleted and numbered lists</li></ul>';

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

  const users = await Promise.all(
    DEMO_USERS.map((user) =>
      db.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, password: passwordHash },
      }),
    ),
  );

  const [alice, bob] = users;
  if (!alice || !bob) {
    throw new Error('Expected exactly two demo users');
  }

  let document = await db.document.findFirst({
    where: { ownerId: alice.id, title: DEMO_DOCUMENT_TITLE },
  });

  document ??= await db.document.create({
    data: { ownerId: alice.id, title: DEMO_DOCUMENT_TITLE, content: DEMO_DOCUMENT_CONTENT },
  });

  await db.documentShare.upsert({
    where: { documentId_userId: { documentId: document.id, userId: bob.id } },
    update: {},
    create: { documentId: document.id, userId: bob.id },
  });

  logger.info(
    `Seed complete: ${DEMO_USERS.map((u) => u.email).join(', ')} (password: ${DEMO_PASSWORD})`,
  );
}

seed()
  .catch((error: unknown) => {
    logger.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
