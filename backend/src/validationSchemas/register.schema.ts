import z from 'zod';
import { emailSchema, passwordSchema } from './password.schema.js';

/**
 * Unicode-aware so that names outside the ASCII range are accepted.
 * \p{L} covers letters, \p{M} the combining marks used by many scripts.
 */
const nameSchema = (field: string): z.ZodType<string> =>
  z
    .string()
    .trim()
    .min(1, `${field} is required!`)
    .max(50, `${field} must be at most 50 characters`)
    .regex(
      /^[\p{L}\p{M}'\- ]+$/u,
      `${field} may only contain letters, spaces, hyphens and apostrophes`,
    )
    .nonoptional(`${field} is required!`);

const registerValidationSchema = z.object({
  firstName: nameSchema('First name'),
  lastName: nameSchema('Last name'),
  email: emailSchema,
  password: passwordSchema,
});

export default registerValidationSchema;
