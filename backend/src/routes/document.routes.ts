import { Router, type RequestHandler } from 'express';
import multer from 'multer';

import documentController from '../controller/document.controller.js';
import { HttpException } from '../exceptions/http.exception.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimiting.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import {
  createDocumentSchema,
  documentIdParamsSchema,
  documentShareParamsSchema,
  shareDocumentSchema,
  updateDocumentSchema,
} from '../validationSchemas/document.schema.js';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — these are small text documents.
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.txt', '.md']);

/**
 * Memory storage: files are parsed into HTML and discarded (see
 * document.controller.ts's `upload` handler), never written to disk.
 * The extension check here is a fast, early reject; document.controller.ts
 * re-checks it before use as defense-in-depth against a spoofed extension
 * making it past this filter some other way.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_request, file, callback) => {
    const dotIndex = file.originalname.lastIndexOf('.');
    const extension = dotIndex === -1 ? '' : file.originalname.slice(dotIndex).toLowerCase();

    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      callback(new HttpException(400, 'Only .txt and .md files are supported'));
      return;
    }

    callback(null, true);
  },
});

export class DocumentRoutes {
  public router: Router;

  private uploadLimiter: RequestHandler;

  constructor() {
    this.router = Router();
    this.uploadLimiter = createRateLimiter('UPLOAD');
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use(authenticate);

    this.router.get('/', documentController.list.bind(documentController));

    this.router.post(
      '/',
      validationMiddleware(createDocumentSchema),
      documentController.create.bind(documentController),
    );

    this.router.post(
      '/upload',
      this.uploadLimiter,
      upload.single('file'),
      documentController.upload.bind(documentController),
    );

    this.router.get(
      '/:id',
      validationMiddleware(documentIdParamsSchema, 'params'),
      documentController.getById.bind(documentController),
    );

    this.router.patch(
      '/:id',
      validationMiddleware(documentIdParamsSchema, 'params'),
      validationMiddleware(updateDocumentSchema),
      documentController.update.bind(documentController),
    );

    this.router.delete(
      '/:id',
      validationMiddleware(documentIdParamsSchema, 'params'),
      documentController.remove.bind(documentController),
    );

    this.router.get(
      '/:id/shares',
      validationMiddleware(documentIdParamsSchema, 'params'),
      documentController.listShares.bind(documentController),
    );

    this.router.post(
      '/:id/shares',
      validationMiddleware(documentIdParamsSchema, 'params'),
      validationMiddleware(shareDocumentSchema),
      documentController.share.bind(documentController),
    );

    this.router.delete(
      '/:id/shares/:userId',
      validationMiddleware(documentShareParamsSchema, 'params'),
      documentController.revokeShare.bind(documentController),
    );
  }
}
