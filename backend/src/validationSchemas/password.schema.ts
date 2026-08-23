import z from 'zod';

/**
 * 8 to 19 characters, containing at least one lowercase letter, one uppercase
 * letter, one digit and one special character. Whitespace is not permitted
 * inside the password; surrounding whitespace is trimmed before the check.
 */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,19}$/;

export const PASSWORD_RULE_MESSAGE =
  'Password must be 8 to 19 characters and contain at least one uppercase letter, one lowercase letter, one number and one special character.';

export const passwordSchema = z
  .string()
  .trim()
  .regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE)
  .nonoptional('Password is required!');

/**
 * Emails are trimmed and lowercased before the format check, so that
 * "  Foo@Bar.com " and "foo@bar.com" resolve to the same account.
 * The trim must happen before validation: z.email().trim() checks the raw
 * value first and would reject padded input.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Invalid Email'))
  .nonoptional('Email is required!');
