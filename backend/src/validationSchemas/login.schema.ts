import z from 'zod';
import { emailSchema, passwordSchema } from './password.schema.js';

const loginValidationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default loginValidationSchema;
