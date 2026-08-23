export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}
