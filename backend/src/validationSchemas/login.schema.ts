import z from 'zod';

const loginValidationSchema = z.object({
  email: z.email('Invalid Email').nonoptional('Email is required!'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,16}$/,
      'Password must be 8 to 16 characters and contain at least one uppercase, one lowercase letter and one number.',
    )
    .trim()
    .nonoptional('Password is required!'),
});

export default loginValidationSchema;
