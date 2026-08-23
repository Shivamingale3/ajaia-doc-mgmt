import { SignJWT, decodeJwt } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { env } from '../src/config/env.config.js';
import tokenService, {
  AUTH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../src/services/token.service.js';
import type { TokenPair, TokenSubject } from '../src/interfaces/token.interfaces.js';

/** Pure JWT logic — no database involved, so this file needs no cleanup. */

const user: TokenSubject = { id: '01JTESTUSER0000000000000A', email: 'token-test@example.com' };

function accessSecretBytes(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function refreshSecretBytes(): Uint8Array {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET);
}

describe('token.service', () => {
  let pair: TokenPair;

  beforeAll(async () => {
    pair = await tokenService.generateTokenPair(user);
  });

  describe('generateTokenPair', () => {
    it('issues an access token bound to the user and a fresh session id', async () => {
      const claims = await tokenService.verifyAuthToken(pair.authToken);

      expect(claims.sub).toBe(user.id);
      expect(claims.email).toBe(user.email);
      expect(claims.sid).toBe(pair.sessionId);
      expect(claims.type).toBe('access');
    });

    it('issues a refresh token bound to the same session, without an email claim', async () => {
      const claims = await tokenService.verifyRefreshToken(pair.refreshToken);

      expect(claims.sub).toBe(user.id);
      expect(claims.sid).toBe(pair.sessionId);
      expect(claims.type).toBe('refresh');
      expect(claims).not.toHaveProperty('email');
    });

    it('gives the access and refresh token distinct jti values', () => {
      const access = decodeJwt(pair.authToken);
      const refresh = decodeJwt(pair.refreshToken);

      expect(access.jti).toBeDefined();
      expect(access.jti).not.toBe(refresh.jti);
    });
  });

  describe('cross-type rejection', () => {
    it('rejects a refresh token presented as an access token', async () => {
      await expect(tokenService.verifyAuthToken(pair.refreshToken)).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('rejects an access token presented as a refresh token', async () => {
      await expect(tokenService.verifyRefreshToken(pair.authToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('tampering and malformed input', () => {
    it('rejects a token with a modified signature', async () => {
      const tampered = `${pair.authToken.slice(0, -3)}aaa`;

      await expect(tokenService.verifyAuthToken(tampered)).rejects.toThrow('Invalid access token');
    });

    it('rejects a string that is not a JWT at all', async () => {
      await expect(tokenService.verifyAuthToken('not.a.jwt')).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('rejects an alg:none token', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ sub: user.id, sid: 'x', email: user.email, type: 'access' }),
      ).toString('base64url');

      await expect(tokenService.verifyAuthToken(`${header}.${payload}.`)).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('rejects a token signed with the wrong secret', async () => {
      const crossSigned = await new SignJWT({
        sub: user.id,
        sid: 'x',
        email: user.email,
        type: 'access',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(refreshSecretBytes());

      await expect(tokenService.verifyAuthToken(crossSigned)).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('reports an expired token distinctly from an invalid one', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expired = await new SignJWT({
        sub: user.id,
        sid: 'x',
        email: user.email,
        type: 'access',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.id)
        .setIssuer(env.JWT_ISSUER)
        .setAudience(env.JWT_AUDIENCE)
        .setIssuedAt(nowSeconds - 3600)
        .setExpirationTime(nowSeconds - 60)
        .sign(accessSecretBytes());

      await expect(tokenService.verifyAuthToken(expired)).rejects.toThrow(
        'Your access token has expired',
      );
    });
  });

  describe('rotateTokenPair', () => {
    it('preserves the session id and issues fresh tokens', async () => {
      const rotated = await tokenService.rotateTokenPair(pair.refreshToken, user);

      expect(rotated.sessionId).toBe(pair.sessionId);
      expect(rotated.authToken).not.toBe(pair.authToken);
      expect(rotated.refreshToken).not.toBe(pair.refreshToken);

      const claims = await tokenService.verifyRefreshToken(rotated.refreshToken);
      expect(claims.sid).toBe(pair.sessionId);
    });

    it('rejects rotation for a user that does not match the refresh token subject', async () => {
      await expect(
        tokenService.rotateTokenPair(pair.refreshToken, {
          id: 'someone-else',
          email: 'someone-else@example.com',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('cookies', () => {
    it('sets both tokens as httpOnly, with the refresh cookie scoped to /api/auth', () => {
      const set: Record<string, { value: string; opts: Record<string, unknown> }> = {};
      const res = {
        cookie: (name: string, value: string, opts: Record<string, unknown>) => {
          set[name] = { value, opts };
        },
      };

      tokenService.setAuthCookies(res as any, pair);

      expect(set[AUTH_TOKEN_COOKIE]?.opts).toMatchObject({
        httpOnly: true,
        path: '/',
        maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
      });
      expect(set[REFRESH_TOKEN_COOKIE]?.opts).toMatchObject({
        httpOnly: true,
        path: '/api/auth',
        maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
      });
    });

    it('clears both cookies using the same path they were set with', () => {
      const cleared: Record<string, Record<string, unknown>> = {};
      const res = {
        clearCookie: (name: string, opts: Record<string, unknown>) => {
          cleared[name] = opts;
        },
      };

      tokenService.clearAuthCookies(res as any);

      expect(cleared[AUTH_TOKEN_COOKIE]?.['path']).toBe('/');
      expect(cleared[REFRESH_TOKEN_COOKIE]?.['path']).toBe('/api/auth');
    });

    it('reads both tokens off request cookies', () => {
      const request = { cookies: { [AUTH_TOKEN_COOKIE]: 'a', [REFRESH_TOKEN_COOKIE]: 'r' } } as any;

      const tokens = tokenService.readTokensFromRequest(request);

      expect(tokens).toEqual({ authToken: 'a', refreshToken: 'r' });
    });

    it('reports no tokens when cookie-parser has not run', () => {
      const tokens = tokenService.readTokensFromRequest({} as any);

      expect(tokens).toEqual({ authToken: undefined, refreshToken: undefined });
    });
  });
});
