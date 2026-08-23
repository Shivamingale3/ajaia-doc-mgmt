import type { NextFunction, Request, Response } from 'express';

import { HttpException } from '../exceptions/http.exception.js';
import tokenService from '../services/token.service.js';

/**
 * Verifies the access token cookie and puts the caller on `req.user`.
 *
 * A missing token and an invalid one are answered differently on purpose: an
 * expired token returns "Your access token has expired", which is the client's
 * cue to call POST /api/auth/refresh and retry.
 */
export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const { authToken } = tokenService.readTokensFromRequest(request);

  if (authToken === undefined) {
    next(new HttpException(401, 'Authentication required'));
    return;
  }

  try {
    const claims = await tokenService.verifyAuthToken(authToken);

    request.user = {
      id: claims.sub,
      email: claims.email,
      sessionId: claims.sid,
    };

    next();
  } catch (error) {
    next(error);
  }
}
