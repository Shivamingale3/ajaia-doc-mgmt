import z from 'zod';
import { emailSchema } from './password.schema.js';

export const DEFAULT_DOCUMENT_TITLE = 'Untitled document';

/** Content is stored as HTML text; capped well above any realistic document
 * (~500KB) so a single request can't be used to exhaust storage. */
const MAX_CONTENT_LENGTH = 500_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

const contentSchema = z.string().max(MAX_CONTENT_LENGTH, 'Document content is too large');

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: 'At least one of title or content must be provided',
  });

export const shareDocumentSchema = z.object({
  email: emailSchema,
});

/** ulid() always produces exactly 26 characters — a cheap, early 400 for a
 * malformed id instead of a confusing not-found further down the stack. */
const idParamSchema = z.string().length(26, 'Invalid id');

export const documentIdParamsSchema = z.object({
  id: idParamSchema,
});

export const documentShareParamsSchema = z.object({
  id: idParamSchema,
  userId: idParamSchema,
});
