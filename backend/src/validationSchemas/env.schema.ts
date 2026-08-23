import z from 'zod';

const envSchema = z.object({
  APP_PORT: z.coerce.number().default(5000).nonoptional(),
  APP_ENV: z
    .enum(['development', 'test', 'production'], {
      error: 'App enviroment can be development , test or production',
    })
    .nonoptional(),
  APP_NAME: z.string().nonoptional().default('pidrive'),
  DATABASE_URL: z.string().nonoptional(),

  // Separate secrets per token type: leaking one must not mint the other.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .nonoptional(),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .nonoptional(),
  JWT_ISSUER: z.string().nonoptional().default('pidrive'),
  JWT_AUDIENCE: z.string().nonoptional().default('pidrive-web'),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 minutes
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604800), // 7 days

  // Defaults to true only in production; override to test cookies over https
  // locally, or to force it off behind a TLS-terminating proxy.
  COOKIE_SECURE: z.stringbool().optional(),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),
});

export default envSchema;
