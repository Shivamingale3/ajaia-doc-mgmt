import { Router } from 'express';
import healthRouter from './health.routes.js';
import { AuthRoutes } from './auth.routes.js';

export const router = Router();

const authRoutes = new AuthRoutes();

router.use('/health', healthRouter);
router.use('/auth', authRoutes.router);
