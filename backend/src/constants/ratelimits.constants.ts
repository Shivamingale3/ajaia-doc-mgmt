import type { RateLimitConfig } from '../interfaces/app.interfaces.js';

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

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
  REGISTER: {
    windowMs: FIFTEEN_MINUTES_MS,
    maxRequests: 10,
    message: 'Too many accounts created from this address, please try again later.',
  },
  REFRESH: {
    windowMs: ONE_MINUTE_MS,
    maxRequests: 20,
    message: 'Too many session refresh attempts, please try again later.',
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;
