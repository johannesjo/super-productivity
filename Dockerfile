FROM oven/bun:1.3.14-alpine AS build

WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/client/package.json ./apps/client/
COPY packages/application/package.json ./packages/application/
COPY packages/domain/package.json ./packages/domain/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/platform/package.json ./packages/platform/
COPY packages/shared-schema/package.json ./packages/shared-schema/
COPY packages/sync-core/package.json ./packages/sync-core/
COPY packages/sync-providers/package.json ./packages/sync-providers/
COPY packages/super-sync-server/package.json ./packages/super-sync-server/
RUN bun install --frozen-lockfile

COPY apps/client ./apps/client
COPY packages/application ./packages/application
COPY packages/domain ./packages/domain
COPY packages/integrations ./packages/integrations
COPY packages/platform ./packages/platform
COPY packages/shared-schema ./packages/shared-schema
COPY packages/sync-core ./packages/sync-core
RUN bun run --cwd apps/client build

FROM nginx:1.29-alpine
ENV APP_PORT=80
COPY --from=build /repo/apps/client/build /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
