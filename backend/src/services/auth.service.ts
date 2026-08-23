import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { HttpException } from '../exceptions/http.exception.js';
import { db } from '../infra/db.js';
import type {
  AuthResult,
  LoginInput,
  PublicUser,
  RegisterInput,
} from '../interfaces/auth.interfaces.js';
import tokenService from './token.service.js';

/**
 * Work factor for bcrypt. 12 is the common current default: roughly 250ms per
 * hash on typical hardware, which is slow enough to make offline cracking
 * expensive without making login feel sluggish.
 */
const BCRYPT_COST = 12;

/** Prisma's unique-constraint violation. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarantees no query can ever select the password column by accident. */
const PUBLIC_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

class AuthService {
  private dummyHash: string | undefined;

  /**
   * Creates the account. The caller is expected to have validated the input.
   *
   * Uniqueness is enforced by catching the database constraint rather than by
   * checking for an existing email first: a check-then-insert leaves a window
   * in which two concurrent signups for the same address both pass the check.
   */
  public async register(input: RegisterInput): Promise<PublicUser> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    try {
      return await db.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: passwordHash,
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new HttpException(409, 'An account with this email already exists');
      }

      throw error;
    }
  }

  /**
   * Verifies credentials and issues a token pair.
   *
   * Both failure modes return the same message, and an unknown email is still
   * compared against a throwaway hash so the request takes the same time as a
   * wrong password would. Otherwise response latency alone reveals which
   * addresses have accounts.
   */
  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await db.user.findUnique({ where: { email: input.email } });

    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.password ?? this.getDummyHash(),
    );

    if (!user || !passwordMatches) {
      throw new HttpException(401, 'Invalid email or password');
    }

    const tokens = await tokenService.generateTokenPair({ id: user.id, email: user.email });

    return { user: this.toPublicUser(user), tokens };
  }

  /**
   * Exchanges a refresh token for a new pair, reusing the session id so the
   * session keeps its identity across refreshes.
   *
   * Reloading the user is the one check that stops a token outliving its
   * account: tokens are stateless, so a deleted user could otherwise keep
   * refreshing until the refresh token's own expiry.
   */
  public async refreshSession(refreshToken: string): Promise<AuthResult> {
    const claims = await tokenService.verifyRefreshToken(refreshToken);

    const user = await db.user.findUnique({
      where: { id: claims.sub },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new HttpException(401, 'Invalid refresh token');
    }

    const tokens = await tokenService.generateTokenPair(
      { id: user.id, email: user.email },
      claims.sid,
    );

    return { user, tokens };
  }

  /** Backs GET /me: resolves the token's subject to the current stored user. */
  public async getProfile(userId: string): Promise<PublicUser> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new HttpException(401, 'This account no longer exists');
    }

    return user;
  }

  /**
   * A hash of a value no user can supply, compared against when the email is
   * unknown. Built on first use rather than at import so the cost is not paid
   * during server startup.
   */
  private getDummyHash(): string {
    this.dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

    return this.dummyHash;
  }

  private toPublicUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

const authService = new AuthService();

export default authService;
