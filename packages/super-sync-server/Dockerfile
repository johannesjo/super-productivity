# Simple production Dockerfile for super-sync-server (single stage)

FROM node:22-alpine

WORKDIR /app

# System deps for Prisma & healthcheck
RUN apk add --no-cache openssl libc6-compat wget

# Copy workspace package files
COPY package.json package-lock.json ./
COPY packages/shared-schema/package.json ./packages/shared-schema/
COPY packages/super-sync-server/package.json ./packages/super-sync-server/

# Install ALL deps for the monorepo (like locally)
RUN npm ci --ignore-scripts

# Copy source files
COPY packages/shared-schema/ ./packages/shared-schema/
COPY packages/super-sync-server/ ./packages/super-sync-server/

# Build shared-schema first
WORKDIR /app/packages/shared-schema
RUN npm run build

# Build super-sync-server
WORKDIR /app/packages/super-sync-server
RUN npx prisma generate
RUN rm -rf dist && npm run build
RUN cp -r public dist/

# Create non-root user and data dir
WORKDIR /app/packages/super-sync-server
RUN addgroup -g 1001 -S nodejs && \
    adduser -S supersync -u 1001 -G nodejs && \
    mkdir -p /app/data && chown -R supersync:nodejs /app/data

USER supersync

EXPOSE 1900

ENV NODE_ENV=production
ENV PORT=1900
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
