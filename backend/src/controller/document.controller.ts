import { type Request, type Response } from 'express';

import { HttpException } from '../exceptions/http.exception.js';
import { fileToHtml, type UploadableExtension } from '../utils/fileToHtml.js';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../interfaces/document.interfaces.js';
import { titleSchema } from '../validationSchemas/document.schema.js';
import { ApiResponse } from '../lib/apiResponse.js';
import documentService from '../services/document.service.js';

/** Extensions accepted by the upload endpoint — kept in sync with the multer
 * file filter in document.routes.ts and the frontend's <input accept>. */
const UPLOAD_EXTENSIONS: readonly UploadableExtension[] = ['txt', 'md'];

/**
 * Every route in document.routes.ts sits behind `authenticate` and a
 * `validationMiddleware(..., 'params')` for any :id/:userId segment, so
 * `request.user` and the params are always populated in practice — these two
 * helpers exist to give TypeScript (and a defense-in-depth runtime check)
 * proof of that without a `!` assertion at each call site.
 */
function requireUserId(request: Request): string {
  if (request.user === undefined) {
    throw new HttpException(401, 'Authentication required');
  }

  return request.user.id;
}

function requireParam(request: Request, name: string): string {
  const value = request.params[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpException(400, `Missing ${name} parameter`);
  }

  return value;
}

/**
 * Handlers are async and throw freely: Express 5 forwards a rejected handler
 * promise to the error middleware on its own.
 */
class DocumentController {
  public async list(request: Request, response: Response): Promise<void> {
    const documents = await documentService.listForUser(requireUserId(request));

    response.status(200).json(ApiResponse.success('Documents fetched successfully', documents));
  }

  public async create(request: Request, response: Response): Promise<void> {
    const document = await documentService.create(
      requireUserId(request),
      request.body as CreateDocumentInput,
    );

    response.status(201).json(ApiResponse.success('Document created successfully', document));
  }

  public async upload(request: Request, response: Response): Promise<void> {
    if (!request.file) {
      throw new HttpException(400, 'No file was uploaded');
    }

    const extension = request.file.originalname.split('.').pop()?.toLowerCase();

    if (!extension || !UPLOAD_EXTENSIONS.includes(extension as UploadableExtension)) {
      throw new HttpException(400, 'Only .txt and .md files are supported');
    }

    const text = request.file.buffer.toString('utf-8');
    const html = fileToHtml(extension as UploadableExtension, text);

    const rawTitle = request.file.originalname.replace(/\.[^./]+$/, '').trim();
    const title = titleSchema.safeParse(rawTitle).data ?? 'Untitled document';

    const document = await documentService.createWithContent(requireUserId(request), title, html);

    response
      .status(201)
      .json(ApiResponse.success('Document created from upload successfully', document));
  }

  public async getById(request: Request, response: Response): Promise<void> {
    const document = await documentService.getById(
      requireParam(request, 'id'),
      requireUserId(request),
    );

    response.status(200).json(ApiResponse.success('Document fetched successfully', document));
  }

  public async update(request: Request, response: Response): Promise<void> {
    const document = await documentService.update(
      requireParam(request, 'id'),
      requireUserId(request),
      request.body as UpdateDocumentInput,
    );

    response.status(200).json(ApiResponse.success('Document saved successfully', document));
  }

  public async remove(request: Request, response: Response): Promise<void> {
    await documentService.remove(requireParam(request, 'id'), requireUserId(request));

    response.status(200).json(ApiResponse.success('Document deleted successfully', null));
  }

  public async listShares(request: Request, response: Response): Promise<void> {
    const shares = await documentService.listShares(
      requireParam(request, 'id'),
      requireUserId(request),
    );

    response.status(200).json(ApiResponse.success('Shares fetched successfully', shares));
  }

  public async share(request: Request, response: Response): Promise<void> {
    const { email } = request.body as { email: string };

    const share = await documentService.share(
      requireParam(request, 'id'),
      requireUserId(request),
      email,
    );

    response.status(201).json(ApiResponse.success('Document shared successfully', share));
  }

  public async revokeShare(request: Request, response: Response): Promise<void> {
    await documentService.revokeShare(
      requireParam(request, 'id'),
      requireUserId(request),
      requireParam(request, 'userId'),
    );

    response.status(200).json(ApiResponse.success('Access revoked successfully', null));
  }
}

const documentController = new DocumentController();

export default documentController;
