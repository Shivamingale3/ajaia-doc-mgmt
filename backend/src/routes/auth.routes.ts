import { Router, type RequestHandler } from 'express';

import authController from '../controller/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimiting.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import loginValidationSchema from '../validationSchemas/login.schema.js';
import registerValidationSchema from '../validationSchemas/register.schema.js';

export class AuthRoutes {
  public router: Router;

  private registerLimiter: RequestHandler;

  private loginLimiter: RequestHandler;

  private refreshLimiter: RequestHandler;

  constructor() {
    this.router = Router();
    this.registerLimiter = createRateLimiter('REGISTER');
    this.loginLimiter = createRateLimiter('LOGIN');
    this.refreshLimiter = createRateLimiter('REFRESH');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      '/register',
      this.registerLimiter,
      validationMiddleware(registerValidationSchema),
      authController.register.bind(authController),
    );

    this.router.post(
      '/login',
      this.loginLimiter,
      validationMiddleware(loginValidationSchema),
      authController.login.bind(authController),
    );

    // No body to validate: the refresh token arrives as a cookie.
    this.router.post('/refresh', this.refreshLimiter, authController.refresh.bind(authController));

    // Deliberately unauthenticated: logging out with an already-expired access
    // token should still clear the cookies rather than fail with a 401.
    this.router.post('/logout', authController.logout.bind(authController));

    this.router.get('/me', authenticate, authController.me.bind(authController));
  }
}
