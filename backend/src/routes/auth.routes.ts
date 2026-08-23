import { Router, type RequestHandler } from 'express';
import { createRateLimiter } from '../middlewares/rateLimiting.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import authController from '../controller/auth.controller.js';
import loginValidationSchema from '../validationSchemas/login.schema.js';

export class AuthRoutes {
  public router: Router;

  private loginLimiter: RequestHandler;

  constructor() {
    this.router = Router();
    this.loginLimiter = createRateLimiter('LOGIN');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      '/login',
      this.loginLimiter,
      validationMiddleware(loginValidationSchema),
      authController.login.bind(authController),
    );

    // this.router.get(
    //   '/filter',
    //   validationMiddleware(getIncidentsByFilterValidationSchema, 'query'),
    //   getAllIncidentsByFilterController,
    // );

    // this.router.get('/kpis', getKpisController);

    // this.router.get(
    //   '/:id',
    //   validationMiddleware(getIncidentByIdValidationSchema, 'params'),
    //   getIncidentByIdController,
    // );

    // this.router.patch(
    //   '/:incidentId/status/:status',
    //   this.updateIncidentLimiter,
    //   validationMiddleware(updateIncidentStatusValidationSchema, 'params'),
    //   updateIncidentStatusController,
    // );

    // this.router.patch(
    //   '/:incidentId/severity/:severity',
    //   this.updateIncidentLimiter,
    //   validationMiddleware(updateIncidentSeverityValidationSchema, 'params'),
    //   updateIncidentSeverityController,
    // );
  }
}
