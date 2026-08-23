# syntax=docker/dockerfile:1
#
# Single combined image: one Express process serves the API under /api and
# the built frontend as static files (see backend/src/app.ts's SPA fallback).
# Build from the repo root: `docker build -t ajaia-doc-mgmt .`

# ---- frontend builder ----
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# No VITE_API_URL or similar is needed: the app's fetch calls use a relative
# `/api` path (see frontend/src/lib/api-client.ts), which resolves correctly
# once this build is served from the same origin as the API in production.
RUN npm run build

# ---- backend builder ----
FROM node:24-alpine AS backend-builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app/backend

COPY backend/package*.json backend/prisma.config.ts ./
COPY backend/prisma ./prisma
RUN npm ci

# Generate Prisma client. This only needs the schema, not a real connection —
# the placeholder is never used to actually connect.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"
RUN npx prisma generate

# Compile TypeScript (skip format/lint checks — those belong to CI/hooks)
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

# ---- runtime ----
FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=backend-builder /app/backend/package.json ./package.json

# app.ts looks for the frontend build at `dist/public` (a sibling of the
# compiled app.js) — see FRONTEND_DIST_PATH in backend/src/app.ts.
COPY --from=frontend-builder /app/frontend/dist ./dist/public

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/server.js"]
