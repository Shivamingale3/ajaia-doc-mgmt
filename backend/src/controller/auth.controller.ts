import { type NextFunction, type Request, type Response } from 'express';

import { HttpException } from '../exceptions/http.exception.js';
import type { LoginInput, RegisterInput } from '../interfaces/auth.interfaces.js';
import { ApiResponse } from '../lib/apiResponse.js';
import authService from '../services/auth.service.js';
import tokenService from '../services/token.service.js';

/**
 * Handlers are async and throw freely: Express 5 forwards a rejected handler
 * promise to the error middleware on its own, so no try/catch is needed here.
 *
 * Request bodies are cast rather than re-parsed because validationMiddleware
 * has already replaced req.body with the schema's output.
 */
class AuthController {
  public async register(request: Request, response: Response): Promise<void> {
    const user = await authService.register(request.body as RegisterInput);

    response
      .status(201)
      .json(ApiResponse.success('Account created successfully. Please log in.', user));
  }

  public async login(request: Request, response: Response): Promise<void> {
    const { user, tokens } = await authService.login(request.body as LoginInput);

    tokenService.setAuthCookies(response, tokens);

    response.status(200).json(ApiResponse.success('Logged in successfully', user));
  }

  public async refresh(request: Request, response: Response): Promise<void> {
    const { refreshToken } = tokenService.readTokensFromRequest(request);

    if (refreshToken === undefined) {
      throw new HttpException(401, 'No refresh token provided');
    }

    const { user, tokens } = await authService.refreshSession(refreshToken);

    tokenService.setAuthCookies(response, tokens);

    response.status(200).json(ApiResponse.success('Session refreshed', user));
  }

  /**
   * Clears the cookies. Tokens are stateless, so any copy the client kept
   * stays technically valid until it expires; clearing the cookies is the
   * whole of logout until a server-side session store exists.
   */
  public logout(_request: Request, response: Response): void {
    tokenService.clearAuthCookies(response);

    response.status(200).json(ApiResponse.success('Logged out successfully', null));
  }

  /** Lets the SPA rehydrate its session on load, since it cannot read the httpOnly cookie. */
  public async me(request: Request, response: Response, next: NextFunction): Promise<void> {
    if (request.user === undefined) {
      next(new HttpException(401, 'Authentication required'));
      return;
    }

    const user = await authService.getProfile(request.user.id);

    response.status(200).json(ApiResponse.success('Profile fetched successfully', user));
  }
}

const authController = new AuthController();

export default authController;
