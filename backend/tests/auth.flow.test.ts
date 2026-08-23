import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app } from '../src/app.js';
import { cleanupTestUsers, uniqueEmail } from './helpers/db.js';

/**
 * Exercises the real Express app against the database DATABASE_URL points
 * at (see tests/global-setup.ts) — no route or service is mocked. Each test
 * uses its own throwaway email (see tests/helpers/db.ts) so this file can
 * run against a real, populated database without touching anyone else's
 * data, and every user it creates is deleted in the matching afterAll.
 */

const PASSWORD = 'Passw0rd!';

describe('POST /api/auth/register', () => {
  const createdEmails: string[] = [];

  afterAll(async () => {
    await cleanupTestUsers(...createdEmails);
  });

  it('creates an account and never returns the password hash', async () => {
    const email = uniqueEmail('register');
    createdEmails.push(email);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: '  Ada ',
        lastName: 'Lovelace',
        email: `  ${email.toUpperCase()} `,
        password: PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      data: { firstName: 'Ada', lastName: 'Lovelace', email },
    });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('rejects a second registration with the same email, case-insensitively', async () => {
    const email = uniqueEmail('duplicate');
    createdEmails.push(email);

    await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', lastName: 'B', email, password: PASSWORD });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'C', lastName: 'D', email: email.toUpperCase(), password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a password missing a special character', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'A', lastName: 'B', email: uniqueEmail('weak'), password: 'Passw0rd' });

    expect(res.status).toBe(400);
  });

  it('rejects a name containing a digit', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Rob3rt',
        lastName: 'B',
        email: uniqueEmail('badname'),
        password: PASSWORD,
      });

    expect(res.status).toBe(400);
  });
});

describe('authenticated session flow', () => {
  const email = uniqueEmail('session');

  afterAll(async () => {
    await cleanupTestUsers(email);
  });

  it('rejects login before the account exists', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('registers the account for the rest of this flow', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Grace', lastName: 'Hopper', email, password: PASSWORD });

    expect(res.status).toBe(201);
  });

  it('rejects a login with the wrong password, identically to an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects GET /me with no session', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('logs in, sets httpOnly cookies scoped correctly, and lets /me resolve the user', async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post('/api/auth/login').send({ email, password: PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.email).toBe(email);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const authCookie = cookies.find((c) => c.startsWith('auth_token='));
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

    expect(authCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Path=\/api\/auth/i);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
  });

  it('rotates the access token on refresh while keeping the session alive', async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    const authTokenBefore = extractCookieValue(loginRes.headers['set-cookie'], 'auth_token');

    // Refresh mints a token with a new iat; sleeping a second guarantees the
    // signature differs even if every other claim were to end up identical.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);

    const authTokenAfter = extractCookieValue(refreshRes.headers['set-cookie'], 'auth_token');
    expect(authTokenAfter).toBeDefined();
    expect(authTokenAfter).not.toBe(authTokenBefore);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
  });

  it('clears cookies on logout, after which /me and /refresh both fail', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ email, password: PASSWORD });

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(401);
  });

  it('rejects a garbage refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=not.a.jwt');

    expect(res.status).toBe(401);
  });
});

function extractCookieValue(setCookieHeader: unknown, name: string): string | undefined {
  const cookies = (setCookieHeader as string[] | undefined) ?? [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));

  return match?.split(';')[0]?.slice(name.length + 1);
}
