import type { TokenPair } from './token.interfaces.js';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** The only user shape that may leave the server: never carries the password hash. */
export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

/** What the authenticate middleware puts on the request, taken from the access token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
}
