import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../src/app.js';
import { cleanupTestUsers, uniqueEmail } from './helpers/db.js';

/**
 * Exercises the real Express app against the database DATABASE_URL points at
 * (see tests/global-setup.ts) — no route or service is mocked. Two real
 * accounts are registered (owner + a second user to share with); their
 * documents/shares cascade-delete automatically when the users themselves
 * are removed in the matching afterAll (see the Cascade FK in
 * prisma/models/document.prisma), so no separate document cleanup is needed.
 */

const PASSWORD = 'Passw0rd!';
const ownerEmail = uniqueEmail('doc-owner');
const otherEmail = uniqueEmail('doc-other');

async function registerAndLogin(email: string, firstName: string): Promise<request.Agent> {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/register')
    .send({ firstName, lastName: 'Test', email, password: PASSWORD });
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

describe('documents: CRUD, access control, sharing, upload', () => {
  let owner: request.Agent;
  let other: request.Agent;

  beforeAll(async () => {
    owner = await registerAndLogin(ownerEmail, 'Owner');
    other = await registerAndLogin(otherEmail, 'Other');
  });

  afterAll(async () => {
    await cleanupTestUsers(ownerEmail, otherEmail);
  });

  it('rejects every document route without a session', async () => {
    await expect(request(app).get('/api/documents')).resolves.toMatchObject({ status: 401 });
    await expect(request(app).post('/api/documents').send({})).resolves.toMatchObject({
      status: 401,
    });
    await expect(request(app).post('/api/documents/upload')).resolves.toMatchObject({
      status: 401,
    });
  });

  it('creates a document, defaulting the title when none is given', async () => {
    const res = await owner.post('/api/documents').send({});

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'Untitled document', role: 'owner', content: '' });
  });

  it('creates, renames, saves content, and lists it under "owned"', async () => {
    const createRes = await owner.post('/api/documents').send({ title: 'My First Doc' });
    const id = createRes.body.data.id as string;

    const updateRes = await owner.patch(`/api/documents/${id}`).send({
      title: 'Renamed Doc',
      content:
        '<h1>Title</h1><p><strong>bold</strong> <em>italic</em> <u>underline</u></p>' +
        '<ul><li>one</li></ul><ol><li>first</li></ol>',
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Renamed Doc');
    expect(updateRes.body.data.content).toContain('<strong>bold</strong>');
    expect(updateRes.body.data.content).toContain('<ul><li>one</li></ul>');

    const listRes = await owner.get('/api/documents');
    const listed = listRes.body.data.find((d: { id: string }) => d.id === id);
    expect(listed).toMatchObject({ title: 'Renamed Doc', role: 'owner' });

    const getRes = await owner.get(`/api/documents/${id}`);
    expect(getRes.body.data.content).toBe(updateRes.body.data.content);
  });

  it('strips a script tag and an event-handler attribute from saved content', async () => {
    const createRes = await owner.post('/api/documents').send({ title: 'Sanitize Me' });
    const id = createRes.body.data.id as string;

    const res = await owner
      .patch(`/api/documents/${id}`)
      .send({ content: '<p>hello<script>alert(1)</script> world</p><img src=x onerror=alert(1)>' });

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('<p>hello world</p>');
  });

  it('rejects an update with neither title nor content', async () => {
    const createRes = await owner.post('/api/documents').send({ title: 'Needs a field' });
    const id = createRes.body.data.id as string;

    const res = await owner.patch(`/api/documents/${id}`).send({});

    expect(res.status).toBe(400);
  });

  it('hides a document from a user with no relationship to it (404, not 403)', async () => {
    const createRes = await owner.post('/api/documents').send({ title: 'Private' });
    const id = createRes.body.data.id as string;

    const getRes = await other.get(`/api/documents/${id}`);
    expect(getRes.status).toBe(404);

    const patchRes = await other.patch(`/api/documents/${id}`).send({ title: 'hacked' });
    expect(patchRes.status).toBe(404);

    const listRes = await other.get('/api/documents');
    expect(listRes.body.data.find((d: { id: string }) => d.id === id)).toBeUndefined();
  });

  describe('sharing', () => {
    it('rejects sharing with yourself', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Share Me' });
      const id = createRes.body.data.id as string;

      const res = await owner.post(`/api/documents/${id}/shares`).send({ email: ownerEmail });

      expect(res.status).toBe(400);
    });

    it('rejects sharing with an email that has no account', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Share Me' });
      const id = createRes.body.data.id as string;

      const res = await owner
        .post(`/api/documents/${id}/shares`)
        .send({ email: 'nobody-at-all@test.invalid' });

      expect(res.status).toBe(404);
    });

    it('rejects a non-owner trying to share', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Share Me' });
      const id = createRes.body.data.id as string;

      const res = await other.post(`/api/documents/${id}/shares`).send({ email: otherEmail });

      expect(res.status).toBe(404);
    });

    it('grants access (case-insensitively), is idempotent, and gives full edit rights', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Shared Doc' });
      const id = createRes.body.data.id as string;

      const shareRes = await owner
        .post(`/api/documents/${id}/shares`)
        .send({ email: otherEmail.toUpperCase() });
      expect(shareRes.status).toBe(201);

      const reShareRes = await owner
        .post(`/api/documents/${id}/shares`)
        .send({ email: otherEmail });
      expect(reShareRes.status).toBe(201);
      expect(reShareRes.body.data.userId).toBe(shareRes.body.data.userId);

      const listRes = await other.get('/api/documents');
      expect(listRes.body.data.find((d: { id: string }) => d.id === id)).toMatchObject({
        role: 'shared',
        ownerName: 'Owner Test',
      });

      const editRes = await other.patch(`/api/documents/${id}`).send({ title: 'Edited by other' });
      expect(editRes.status).toBe(200);
      expect(editRes.body.data.title).toBe('Edited by other');
    });

    it('keeps delete and share-management owner-only, even for a shared editor', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Owner Only Actions' });
      const id = createRes.body.data.id as string;
      await owner.post(`/api/documents/${id}/shares`).send({ email: otherEmail });

      const deleteRes = await other.delete(`/api/documents/${id}`);
      expect(deleteRes.status).toBe(403);

      const listSharesRes = await other.get(`/api/documents/${id}/shares`);
      expect(listSharesRes.status).toBe(403);
    });

    it('revokes access, after which the document disappears for that user, and revoking again is a no-op', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Revoke Me' });
      const id = createRes.body.data.id as string;
      const shareRes = await owner.post(`/api/documents/${id}/shares`).send({ email: otherEmail });
      const targetUserId = shareRes.body.data.userId as string;

      const beforeRevoke = await other.get(`/api/documents/${id}`);
      expect(beforeRevoke.status).toBe(200);

      const revokeRes = await owner.delete(`/api/documents/${id}/shares/${targetUserId}`);
      expect(revokeRes.status).toBe(200);

      const afterRevoke = await other.get(`/api/documents/${id}`);
      expect(afterRevoke.status).toBe(404);

      const revokeAgainRes = await owner.delete(`/api/documents/${id}/shares/${targetUserId}`);
      expect(revokeAgainRes.status).toBe(200);
    });
  });

  describe('delete', () => {
    it('lets the owner delete a document, after which it is gone for them too', async () => {
      const createRes = await owner.post('/api/documents').send({ title: 'Delete Me' });
      const id = createRes.body.data.id as string;

      const deleteRes = await owner.delete(`/api/documents/${id}`);
      expect(deleteRes.status).toBe(200);

      const getRes = await owner.get(`/api/documents/${id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('upload', () => {
    it('creates a document from an uploaded .txt file', async () => {
      const res = await owner
        .post('/api/documents/upload')
        .attach('file', Buffer.from('First paragraph.\n\nSecond paragraph.'), 'notes.txt');

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('notes');
      expect(res.body.data.content).toBe('<p>First paragraph.</p><p>Second paragraph.</p>');
    });

    it('creates a document from an uploaded .md file, converting formatting', async () => {
      const markdown = '# Heading\n\nSome **bold** text.\n\n- item one\n- item two\n';
      const res = await owner
        .post('/api/documents/upload')
        .attach('file', Buffer.from(markdown), 'notes.md');

      expect(res.status).toBe(201);
      expect(res.body.data.content).toContain('<h1>Heading</h1>');
      expect(res.body.data.content).toContain('<strong>bold</strong>');
      expect(res.body.data.content).toContain('<li>item one</li>');
    });

    it('rejects an unsupported file extension', async () => {
      const res = await owner
        .post('/api/documents/upload')
        .attach('file', Buffer.from('echo malicious'), 'script.exe');

      expect(res.status).toBe(400);
    });

    it('rejects a request with no file', async () => {
      const res = await owner.post('/api/documents/upload');

      expect(res.status).toBe(400);
    });
  });
});
