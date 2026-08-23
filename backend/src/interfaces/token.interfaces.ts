import type { JWTPayload } from 'jose';

export type TokenType = 'access' | 'refresh';

/** The minimum a caller must know about a user to mint a token pair for them. */
export interface TokenSubject {
  id: string;
  email: string;
}

/**
 * Short-lived token sent with every authenticated request.
 * `sid` ties the access token back to the login session that issued it.
 */
export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  sid: string;
  email: string;
  type: 'access';
}

/**
 * Long-lived token, only ever presented to the auth routes.
 * Deliberately carries no email or role: it exists to prove "this session is
 * still alive", nothing more.
 */
export interface RefreshTokenClaims extends JWTPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

export interface TokenPair {
  authToken: string;
  refreshToken: string;
  sessionId: string;
}

/** Tokens lifted off an incoming request's cookies; either may be absent. */
export interface CookieTokens {
  authToken: string | undefined;
  refreshToken: string | undefined;
}
