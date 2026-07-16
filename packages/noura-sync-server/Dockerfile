FROM oven/bun:1.3.14-alpine AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/client/package.json ./apps/client/
COPY packages/application/package.json ./packages/application/
COPY packages/domain/package.json ./packages/domain/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/platform/package.json ./packages/platform/
COPY packages/shared-schema/package.json ./packages/shared-schema/
COPY packages/sync-core/package.json ./packages/sync-core/
COPY packages/sync-providers/package.json ./packages/sync-providers/
COPY packages/noura-sync-server/package.json ./packages/noura-sync-server/

RUN bun install --frozen-lockfile

FROM dependencies AS verified

COPY packages/shared-schema ./packages/shared-schema
COPY packages/sync-core ./packages/sync-core
COPY packages/noura-sync-server ./packages/noura-sync-server

RUN bun run --cwd packages/noura-sync-server build

FROM oven/bun:1.3.14-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1900

COPY --from=verified --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=verified --chown=bun:bun /app/node_modules ./node_modules
COPY --from=verified --chown=bun:bun /app/packages/shared-schema ./packages/shared-schema
COPY --from=verified --chown=bun:bun /app/packages/sync-core ./packages/sync-core
COPY --from=verified --chown=bun:bun /app/packages/noura-sync-server ./packages/noura-sync-server

USER bun
EXPOSE 1900

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "const response = await fetch('http://127.0.0.1:' + (process.env.PORT || 1900) + '/health'); if (!response.ok) process.exit(1)"

CMD ["bun", "run", "--cwd", "packages/noura-sync-server", "start"]
