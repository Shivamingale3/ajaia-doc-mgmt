import { Router } from 'express';
import healthRouter from './health.routes.js';
import { AuthRoutes } from './auth.routes.js';
import { DocumentRoutes } from './document.routes.js';

export const router = Router();

const authRoutes = new AuthRoutes();
const documentRoutes = new DocumentRoutes();

router.use('/health', healthRouter);
router.use('/auth', authRoutes.router);
router.use('/documents', documentRoutes.router);
