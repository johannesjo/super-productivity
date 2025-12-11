FROM node:22-alpine AS builder

WORKDIR /app

# Install required system dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files for whole workspace
COPY package.json package-lock.json ./
COPY packages/shared-schema/package.json ./packages/shared-schema/
COPY packages/super-sync-server/package.json ./packages/super-sync-server/

# Install ALL dependencies for the monorepo, like you do locally
RUN npm ci --ignore-scripts

# Copy source files
COPY packages/shared-schema/ ./packages/shared-schema/
COPY packages/super-sync-server/ ./packages/super-sync-server/

# Build shared-schema first (it's a dependency)
WORKDIR /app/packages/shared-schema
RUN npm run build

# Build super-sync-server
WORKDIR /app/packages/super-sync-server
RUN npx prisma generate
RUN rm -rf dist && npm run build

# Copy public files to dist
RUN cp -r public dist/

FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache openssl libc6-compat

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S supersync -u 1001 -G nodejs

# Copy built artifacts from builder
COPY --from=builder /app/packages/super-sync-server/dist ./dist
COPY --from=builder /app/packages/super-sync-server/package.json ./
COPY --from=builder /app/packages/super-sync-server/prisma ./prisma

# Copy shared-schema (required dependency)
COPY --from=builder /app/packages/shared-schema/dist /app/node_modules/@sp/shared-schema/dist
COPY --from=builder /app/packages/shared-schema/package.json /app/node_modules/@sp/shared-schema/

# IMPORTANT: copy the root node_modules from the builder
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data && chown -R supersync:nodejs /app/data

# Switch to non-root user
USER supersync

EXPOSE 1900

ENV NODE_ENV=production
ENV PORT=1900
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]