# SuperSync self-hosting

Noura retains the complete SuperSync server in `packages/super-sync-server`, including WebAuthn/account endpoints, PostgreSQL and SQLite support, conflict detection, snapshots, pruning, monitoring, backup/recovery scripts, and Helm assets.

## Local stack

```sh
cp packages/super-sync-server/env.example .env
docker compose up --build db supersync
```

The server listens on `http://localhost:1900`. Its health endpoint is `/health`. The test override in `docker-compose.supersync.yaml` exposes port 1901.

## Client connection

Create or obtain an access token through the server account flow, then enter the server URL, token, and a client-side encryption passphrase in Settings → Account. The token and passphrase live only for the current app process. Noura persists the client ID, cursor, and vector clock locally.

## Production

Use `packages/super-sync-server/docker-compose.yml` and its documented deployment script for production. Migrations are deliberately run as a separate deployment step. Consult the server package README and its `docs/` directory for backups, encryption at rest, monitoring, and recovery.
