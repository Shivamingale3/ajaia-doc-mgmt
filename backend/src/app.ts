import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.config.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimiting.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { router } from './routes/index.routes.js';
import { morganStream } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The production Docker image copies the frontend's built assets to
 * `dist/public` (a sibling of this compiled file — see the root Dockerfile).
 * Locally, that directory never exists: `npm run dev` runs this file via tsx
 * directly from src/, and the frontend is served separately by Vite. This
 * check is what lets the same app.ts work in both worlds.
 */
const FRONTEND_DIST_PATH = path.resolve(__dirname, 'public');
const serveFrontend = fs.existsSync(FRONTEND_DIST_PATH);

export const app = express();

// Cloudflare Tunnel (cloudflared) fronts this server in production and sets
// X-Forwarded-* headers. Without `trust proxy`, express-rate-limit's
// xForwardedForHeader validation crashes the route on every request, and
// COOKIE_SECURE's logic would see the tunnel's plain-HTTP hop instead of the
// browser's actual HTTPS connection. `1` trusts exactly one hop.
app.set('trust proxy', 1);

app.use(helmet());

// credentials:true is required for the auth cookies to survive a cross-origin
// request, and it forbids the "*" origin -- hence the explicit allowlist.
// In production this is same-origin (one process serves both the API and the
// built frontend), so CORS is mostly moot there; it matters for local dev,
// where Vite's dev server and this API run on different ports.
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));

app.use(globalRateLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Populates req.cookies, which is where the auth and refresh tokens live.
app.use(cookieParser());

app.use(morgan('dev', { stream: morganStream }));

app.use('/api', router);
app.use('/api', notFoundHandler);

if (serveFrontend) {
  app.use(express.static(FRONTEND_DIST_PATH));

  // SPA fallback: any non-API GET that didn't match a static file is a
  // client-side route (e.g. /documents/abc123 on a hard refresh) — hand it
  // index.html and let TanStack Router take over. A plain `app.use` with no
  // path pattern is deliberate: Express 5's wildcard path syntax changed
  // (path-to-regexp v8), and everything reaching this point has already
  // fallen through /api and the static middleware, so an unconditional
  // catch-all is both correct and avoids that syntax entirely.
  app.use((_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
  });
} else {
  app.use(notFoundHandler);
}

app.use(errorHandler);
