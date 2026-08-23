import type { CookieOptions, Request, Response } from 'express';
import { SignJWT, errors, jwtVerify, type JWTVerifyOptions } from 'jose';
import { ulid } from 'ulid';

import { env } from '../config/env.config.js';
import { HttpException } from '../exceptions/http.exception.js';
import type {
  AccessTokenClaims,
  CookieTokens,
  RefreshTokenClaims,
  TokenPair,
  TokenSubject,
  TokenType,
} from '../interfaces/token.interfaces.js';

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * The refresh cookie is scoped to the auth routes so the browser does not
 * attach it to every API call. Only /api/auth/refresh and /api/auth/logout
 * ever need to read it, which keeps the long-lived credential off the wire
 * for the other 99% of requests.
 */
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

const JWT_ALGORITHM = 'HS256';

/** Absorbs small clock differences between the signer and the verifier. */
const CLOCK_TOLERANCE_SECONDS = 5;

/**
 * Issues and verifies the two JWTs the app runs on.
 *
 * Both tokens are stateless: verification is a signature check plus claim
 * validation, with no Redis or database round-trip. That buys speed and
 * simplicity at a real cost — a leaked refresh token stays usable until it
 * expires, and there is no "log out everywhere". Every token carries a `sid`
 * (session id) so that an allow/deny list can be added later without
 * changing the token shape or invalidating anything already issued.
 *
 * Access and refresh tokens are signed with separate secrets and also carry
 * an explicit `type` claim, so a refresh token can never be replayed as an
 * access token even if the secrets were ever misconfigured to match.
 */
class TokenService {
  private readonly authSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;

  constructor() {
    const encoder = new TextEncoder();
    this.authSecret = encoder.encode(env.JWT_ACCESS_SECRET);
    this.refreshSecret = encoder.encode(env.JWT_REFRESH_SECRET);
  }

  /**
   * Mints a fresh session: a new `sid` plus both tokens.
   * Pass an existing `sessionId` to reissue tokens for a session that is
   * already running (see {@link rotateTokenPair}).
   */
  public async generateTokenPair(user: TokenSubject, sessionId?: string): Promise<TokenPair> {
    const sid = sessionId ?? ulid();

    const [authToken, refreshToken] = await Promise.all([
      this.generateAuthToken(user, sid),
      this.generateRefreshToken(user.id, sid),
    ]);

    return { authToken, refreshToken, sessionId: sid };
  }

  public async generateAuthToken(user: TokenSubject, sessionId: string): Promise<string> {
    return this.sign(
      { sub: user.id, sid: sessionId, email: user.email, type: 'access' },
      this.authSecret,
      env.ACCESS_TOKEN_TTL_SECONDS,
    );
  }

  public async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    return this.sign(
      { sub: userId, sid: sessionId, type: 'refresh' },
      this.refreshSecret,
      env.REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  public async verifyAuthToken(token: string): Promise<AccessTokenClaims> {
    const claims = await this.verify<AccessTokenClaims>(token, this.authSecret, 'access');

    if (typeof claims.email !== 'string' || claims.email.length === 0) {
      throw new HttpException(401, 'Invalid access token');
    }

    return claims;
  }

  public async verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    return this.verify<RefreshTokenClaims>(token, this.refreshSecret, 'refresh');
  }

  /**
   * Exchanges a valid refresh token for a brand new pair, reusing the same
   * `sid` so the session keeps its identity across refreshes.
   *
   * The caller is expected to have loaded `user` from the database, which is
   * what keeps a deleted or disabled account from refreshing forever. The
   * subject check below is belt-and-braces against a caller pairing a token
   * with the wrong user record.
   */
  public async rotateTokenPair(refreshToken: string, user: TokenSubject): Promise<TokenPair> {
    const claims = await this.verifyRefreshToken(refreshToken);

    if (claims.sub !== user.id) {
      throw new HttpException(401, 'Invalid refresh token');
    }

    return this.generateTokenPair(user, claims.sid);
  }

  public setAuthCookies(response: Response, tokens: TokenPair): void {
    response.cookie(
      AUTH_TOKEN_COOKIE,
      tokens.authToken,
      this.cookieOptions(env.ACCESS_TOKEN_TTL_SECONDS),
    );

    response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(env.REFRESH_TOKEN_TTL_SECONDS),
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  /**
   * Clears both cookies. The options must mirror those used when setting them
   * (path in particular) or the browser will quietly keep the old cookie.
   */
  public clearAuthCookies(response: Response): void {
    response.clearCookie(AUTH_TOKEN_COOKIE, this.cookieOptions(0));

    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...this.cookieOptions(0),
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  /**
   * Reads both tokens off the request cookies.
   *
   * Requires `cookie-parser` to be registered on the app; without it
   * `req.cookies` is undefined and this always reports no tokens.
   */
  public readTokensFromRequest(request: Request): CookieTokens {
    const cookies = (request.cookies ?? {}) as Record<string, string | undefined>;

    return {
      authToken: cookies[AUTH_TOKEN_COOKIE],
      refreshToken: cookies[REFRESH_TOKEN_COOKIE],
    };
  }

  private async sign(
    claims: AccessTokenClaims | RefreshTokenClaims,
    secret: Uint8Array,
    ttlSeconds: number,
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setSubject(claims.sub)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setJti(ulid())
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`)
      .sign(secret);
  }

  private async verify<TClaims extends AccessTokenClaims | RefreshTokenClaims>(
    token: string,
    secret: Uint8Array,
    expectedType: TokenType,
  ): Promise<TClaims> {
    const label = expectedType === 'access' ? 'access token' : 'refresh token';

    const options: JWTVerifyOptions = {
      algorithms: [JWT_ALGORITHM],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    };

    let claims: TClaims;

    try {
      const { payload } = await jwtVerify<TClaims>(token, secret, options);
      claims = payload;
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw new HttpException(401, `Your ${label} has expired`);
      }

      // Anything else (bad signature, wrong issuer, malformed token) is
      // reported the same way on purpose: the client learns nothing about
      // why the token was rejected.
      throw new HttpException(401, `Invalid ${label}`);
    }

    if (
      claims.type !== expectedType ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string'
    ) {
      throw new HttpException(401, `Invalid ${label}`);
    }

    return claims;
  }

  private cookieOptions(maxAgeSeconds: number): CookieOptions {
    return {
      httpOnly: true,
      secure: env.COOKIE_SECURE ?? env.APP_ENV === 'production',
      sameSite: env.COOKIE_SAME_SITE,
      path: '/',
      maxAge: maxAgeSeconds * 1000,
      ...(env.COOKIE_DOMAIN === undefined ? {} : { domain: env.COOKIE_DOMAIN }),
    };
  }
}

const tokenService = new TokenService();

export default tokenService;
