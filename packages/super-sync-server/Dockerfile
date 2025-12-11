# ---- Builder stage ----
FROM node:22-alpine AS builder

WORKDIR /repo

RUN apk add --no-cache openssl libc6-compat

# Root package + lock (for workspace install)
COPY package.json package-lock.json ./
COPY packages/shared-schema/package.json ./packages/shared-schema/
COPY packages/super-sync-server/package.json ./packages/super-sync-server/

# Install ALL dependencies for the monorepo
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared-schema/ ./packages/shared-schema/
COPY packages/super-sync-server/ ./packages/super-sync-server/

# Build shared-schema
WORKDIR /repo/packages/shared-schema
RUN npm run build
# Pack shared-schema to tgz for installation in production
RUN npm pack

# Build super-sync-server
WORKDIR /repo/packages/super-sync-server
RUN npx prisma generate
RUN rm -rf dist && npm run build
RUN cp -r public dist/

# ---- Runtime stage ----
FROM node:22-alpine AS production

WORKDIR /app

# System deps for Prisma & healthcheck
RUN apk add --no-cache openssl libc6-compat wget

# Copy built artifacts from builder
COPY --from=builder /repo/packages/super-sync-server/dist ./dist
COPY --from=builder /repo/packages/super-sync-server/prisma ./prisma
COPY --from=builder /repo/packages/super-sync-server/package.json ./package.json

# Copy shared-schema tarball
COPY --from=builder /repo/packages/shared-schema/sp-shared-schema-*.tgz ./shared-schema.tgz

# 1. Install local dependency from tarball
RUN npm install ./shared-schema.tgz --ignore-scripts

# 2. Install remaining production dependencies (including fastify)
RUN npm install --ignore-scripts --omit=dev

# Non-root user + Data directory
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