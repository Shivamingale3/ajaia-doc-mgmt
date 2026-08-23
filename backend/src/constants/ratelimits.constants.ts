import type { RateLimitConfig } from '../interfaces/app.interfaces.js';

const ONE_MINUTE_MS = 60 * 1000;

export const RATE_LIMIT_DEFAULT_MESSAGE = 'Too many requests, please try again later.';

export const RATE_LIMITS = {
  GLOBAL: {
    windowMs: ONE_MINUTE_MS,
    maxRequests: 60,
  },
  LOGIN: {
    windowMs: ONE_MINUTE_MS,
    maxRequests: 5,
    message: 'Too many login attempts, please try again later.',
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;
