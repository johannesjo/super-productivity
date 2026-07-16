# NouraSync

NouraSync is Noura's optional, self-hostable synchronization service. It keeps the existing HTTP and WebSocket wire contract while running on Bun with Hono, Drizzle, and PostgreSQL 16.

## Requirements

- Bun 1.3.14
- PostgreSQL 16
- A 32-character or longer JWT secret
- SMTP credentials for magic links, verification, and passkey recovery
- HTTPS in production

## Local development

```bash
cp packages/noura-sync-server/.env.example packages/noura-sync-server/.env
bun install
bun run --cwd packages/noura-sync-server db:migrate
bun run nourasync:dev
```

The service listens on port `1900` by default. Health is available at `GET /health`.

## Docker Compose

From the repository root:

```bash
docker compose --env-file packages/noura-sync-server/.env \
  -f packages/noura-sync-server/docker-compose.yml up --build
```

Compose starts one NouraSync replica and PostgreSQL 16, applies the Drizzle migration, and then starts the server. Set `PUBLIC_URL` to an externally reachable HTTPS URL.

## Railway

The root `railway.json` builds the server with its root Docker context, runs Drizzle migrations as the pre-deploy command, probes `/health`, and fixes the service at one replica.

Create a managed PostgreSQL service and set:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<32+ random characters>
PUBLIC_URL=https://<your-domain>
CORS_ORIGINS=<comma-separated client origins>
WEBAUTHN_RP_ID=<your-domain>
WEBAUTHN_RP_NAME=NouraSync
WEBAUTHN_ORIGIN=https://<your-domain>
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=NouraSync <noreply@your-domain>
NOURASYNC_DEFAULT_STORAGE_QUOTA_BYTES=104857600
NOURASYNC_RETENTION_DAYS=45
```

Keep exactly one replica. WebSocket registrations, request rate limits, cleanup locks, and short-lived caches are intentionally in memory.

## Database

The canonical schema is `src/db/schema.ts`. `drizzle/0000_nourasync.sql` is the complete initial schema for a new database. There is no database import, compatibility migration, or upgrade path from any previous sync server.

Useful commands:

```bash
bun run --cwd packages/noura-sync-server db:generate
bun run --cwd packages/noura-sync-server db:check
bun run --cwd packages/noura-sync-server db:migrate
```

## Verification

```bash
bun run --cwd packages/noura-sync-server build
bun run --cwd packages/noura-sync-server test
```

The test suite covers authentication, passkeys, magic links, operation ordering, conflicts, deduplication, snapshots, quotas, cleanup, compression, restore points, and WebSocket notification behavior.
