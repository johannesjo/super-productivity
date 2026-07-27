# Backup & Disaster Recovery

## Architecture Context

Super Productivity uses an append-only operation log for sync. Every client (desktop, mobile, web) keeps a full copy of its data in local IndexedDB. The server is a relay — **clients are the source of truth**, not the server.

This means disaster recovery is simpler than in a traditional server-authoritative system: as long as one client device survives, all data can be recovered.

## What the Backup Protects

| Data                                 | Where it lives             | Why back it up                             |
| ------------------------------------ | -------------------------- | ------------------------------------------ |
| User accounts (email, password hash) | Server only                | Users can't authenticate without this      |
| Passkeys (WebAuthn credentials)      | Server only                | Can't be regenerated                       |
| Operation log                        | Server + all clients       | Last resort if all client devices are lost |
| Task/project/tag data                | Derived from operation log | Clients reconstruct from ops               |

## Backup Setup

### Daily Automated Backup

The backup script creates two dumps:

- **Full dump** (`supersync_*.sql.gz`) — complete database including all operations (~300MB+ for active instances)
- **Accounts-only dump** (`supersync_accounts_*.sql.gz`) — just `users` and `passkeys` tables (tiny, <1MB)

```bash
# Run manually
./scripts/backup.sh

# Set up daily cron at 3 AM with 3-day retention
(crontab -l 2>/dev/null; echo "0 3 * * * RETENTION_DAYS=3 /path/to/scripts/backup.sh >> /var/log/supersync-backup.log 2>&1") | crontab -
```

Backups are saved to `backups/` next to the scripts directory.

### Configuration

| Variable         | Default              | Description                                |
| ---------------- | -------------------- | ------------------------------------------ |
| `BACKUP_DIR`     | `../backups`         | Where to store backup files                |
| `RETENTION_DAYS` | `14`                 | Delete backups older than this             |
| `DB_CONTAINER`   | `supersync-postgres` | Docker container name                      |
| `POSTGRES_USER`  | `supersync`          | Database user                              |
| `POSTGRES_DB`    | `supersync`          | Database name                              |
| `RCLONE_REMOTE`  | (empty)              | Optional rclone remote for off-site upload |

### Off-site Backup (Optional)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure a remote (e.g., Backblaze B2)
rclone config

# Run backup with upload
RCLONE_REMOTE=b2:my-bucket/supersync ./scripts/backup.sh --upload
```

## Disaster Recovery

### Recommended: Accounts-Only Restore

This is the simplest and most reliable recovery method when at least one client device has been online recently.

**How it works:**

1. Restore the accounts-only dump (users + passkeys)
2. Sync data (operations, snapshots) starts empty
3. When clients reconnect, gap detection fires automatically
4. Each client re-uploads its full state to the server
5. All clients converge to a consistent state

**Steps:**

```bash
# 1. Restore accounts from backup
gunzip -c backups/supersync_accounts_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i supersync-postgres psql -U supersync supersync

# 2. That's it — clients will re-sync automatically when they connect
```

**Why this is preferred:**

- Avoids `SYNC_IMPORT_EXISTS` conflicts that occur with partial restores
- Clients hold the complete data — they are the authoritative source
- Produces a clean, consistent server state
- Verified by e2e tests (`supersync-server-backup-revert.spec.ts`)

### Fallback: Full Database Restore

Use this only if **all client devices are lost** (no client can re-upload data).

```bash
# 1. Stop the server
docker compose stop supersync

# 2. Drop existing data and restore the full dump
docker exec -i supersync-postgres psql -U supersync supersync \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c backups/supersync_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i supersync-postgres psql -U supersync supersync

# 3. Restart the server
docker compose start supersync
```

> **Note:** The database name (`supersync` above) must match your deployment's
> `POSTGRES_DB` setting. Check your `.env` or `docker-compose.yml` for the actual value.

**Known limitation:** If clients reconnect after a full restore, the server's existing `SYNC_IMPORT` operation can conflict with the client's gap detection mechanism (`SYNC_IMPORT_EXISTS` error). To resolve this, use the "Reset Account" feature in the app to clear server sync data, then re-sync.

### Recovery Decision Tree

```
Server is down / data lost
├── Do any client devices still have data?
│   ├── YES → Use accounts-only restore (recommended)
│   │         Clients will re-upload automatically
│   └── NO  → Use full database restore (fallback)
│             Accept data loss since last backup
```

## Per-User Recovery (single account wiped)

The procedures above recover the **whole server**. A different situation: one
user's account is wiped — usually because a bad `SYNC_IMPORT` propagated an
empty or stale snapshot across their devices — and you need to roll _that one
user_ back to a point in time.

The in-app **Restore from History** handles this for unencrypted accounts. It
does **not** work for E2E-encrypted accounts: the server cannot decrypt the op
payloads, so `generateSnapshotAtSeq` throws `EncryptedOpsNotSupportedError`.

### Diagnose an encrypted download without an app build

When an encrypted account downloads many operation pages successfully and then
fails with `Failed to decrypt operation payloads`, do not assume the passphrase
is globally wrong. One corrupt or differently keyed operation rejects the whole
batch with the same error.

Before diagnosing:

1. Preserve any surviving client profile and automatic backups.
2. Stop every client for the account so the server sequence cannot advance.
3. Take a full, checksummed server backup. The commands below are read-only, but
   a backup remains the recovery source of last resort.

`diagnose-encrypted-ops` is a DB-independent, two-phase tool. Its `fetch`
command makes only authenticated `GET /api/sync/ops` requests. It captures the
complete downloadable encrypted suffix from sequence zero, pins the first
`latestSeq`, and aborts on a changed sequence, gap, malformed response, or
non-progressing page. It never uploads or decrypts during this phase.

Create an access-token file using a trusted text editor, copy the JWT from the
SuperSync account page, and restrict the file permissions. Then run from the
repository root:

```bash
chmod 600 /absolute/path/token.txt
npm --workspace packages/super-sync-server run diagnose-encrypted-ops -- fetch \
  --base-url https://sync.super-productivity.com \
  --token-file /absolute/path/token.txt \
  --out /absolute/path/encrypted-ops-bundle.json
```

The output is created with mode `0600` and is never overwritten. Its payloads
remain E2E-encrypted, but operation IDs, client IDs, routing metadata, and
timestamps are plaintext. Treat it as sensitive. The embedded SHA-256 checksum
detects accidental modification; it is not a signature and does not prove
server authenticity.

For diagnosis, disconnect from the network if practical, put the E2EE
passphrase in another mode-`0600` file, and run:

```bash
chmod 600 /absolute/path/e2ee-passphrase.txt
npm --workspace packages/super-sync-server run diagnose-encrypted-ops -- diagnose \
  --in /absolute/path/encrypted-ops-bundle.json \
  --key-file /absolute/path/e2ee-passphrase.txt \
  --report /absolute/path/encrypted-ops-report.json
```

The report contains only safe operation identifiers, sequence numbers, counts,
and failure stages. It never contains the passphrase, token, ciphertext, or
decrypted payload. A fresh client starts at sequence zero, which is the default.
To reproduce an existing client's exact next batches, add
`--since-seq <persisted-last-server-seq>` and `--exclude-client <client-id>`.
If the client already stored operation IDs, put one ID per line in a file and
add `--applied-op-ids-file <path>`. The cursor is applied first, client
exclusion happens before 500-operation pagination, and stored IDs are removed
inside each raw page, matching the app. If the persisted cursor is ahead of the
bundle's `latestSeq`, the app resets it to zero; omit `--since-seq` to reproduce
the post-reset pages.

Interpret the result conservatively:

- `confirmed-for-some-operations`: the passphrase decrypted at least one
  authenticated payload, so it is not globally wrong.
- `no-operation-decrypted`: consistent with a wrong passphrase, but also with a
  wholly different-key or corrupt range; it is not proof.
- `operation-failures`: the report identifies each failing `serverSeq` and
  whether its envelope, decryption, or decrypted JSON failed.
- `batch-runtime-only`: the exact batch failed while every operation passed
  individually, pointing to a batch/cache/runtime-specific problem.
- `decrypts-and-parses-only`: every selected payload authenticated, decrypted,
  and parsed as JSON. This does not validate operation semantics or full
  application state.

This is a diagnostic only. It deliberately does not replay operations, validate
full application state, create an importable file, skip a bad operation, or
write anything to SuperSync. Recovery remains a separate decision after the
failure has been reproduced and classified. Remove the temporary token and
passphrase files when diagnosis is complete.

`scripts/recover-user.ts` fills that gap. It replays the user's operation log up
to a chosen `serverSeq`, decrypting encrypted payloads with the user's
passphrase, and writes an importable `AppDataComplete` JSON file. It is
**read-only** on the database.

> **Status: unverified against real encrypted data.** The script lints, builds,
> and its module graph loads, but it has not been run end-to-end against an
> actual encrypted account. Before relying on it in an incident, verify it
> against a known account (e.g. your own): recover at the latest seq and confirm
> the entity counts match the live app.

**1. Inspect** — find the cutoff sequence (no encryption key needed):

```bash
DATABASE_URL=... npm run recover-user -- --user <email|id> --inspect
```

This lists every full-state op (`SYNC_IMPORT` / `BACKUP_IMPORT` / `REPAIR`) with
timestamps. Identify the bad import; the cutoff is its `serverSeq` minus 1.

**2. Recover** — replay up to the cutoff and write the importable file:

```bash
DATABASE_URL=... RECOVER_ENCRYPT_KEY='<the user's passphrase>' \
  npm run recover-user -- --user <email|id> --target-seq <N> --out ./recovered.json
```

Add `--dry-run` to preview entity counts without writing. The user imports the
resulting file via **Settings → Import/Export → Import from File**.

**Notes:**

- The encryption key is read only from `RECOVER_ENCRYPT_KEY` or `--key-file` —
  never a CLI argument (process lists / shell history).
- Run it from a dev checkout — it needs `ts-node` and the Prisma client, which
  the production image does not include. Pointing `DATABASE_URL` at a restored
  dump keeps the run fully isolated from production.
- The output file holds the user's complete **plaintext** data — transmit it
  over a secure channel and delete every copy once recovery is confirmed.

## Hoster Backups

If your VPS hoster provides incremental backups (e.g., daily snapshots), these serve as an additional safety net. However:

- **Not a substitute for pg_dump** — filesystem-level backups of a running PostgreSQL database may not be crash-consistent
- **Good complement** — they capture config files, TLS certs, Docker setup, and other server state that pg_dump doesn't cover

The combination of `pg_dump` cron + hoster backups covers both scenarios well.

## Verifying Backups

```bash
# Check backup exists and has reasonable size
ls -lh backups/

# Verify the dump contains valid SQL
gunzip -c backups/supersync_YYYYMMDD_HHMMSS.sql.gz | head -5

# Check cron is running
cat /var/log/supersync-backup.log
```

## E2E Test Coverage

The backup recovery scenarios are covered by automated tests in `e2e/tests/sync/supersync-server-backup-revert.spec.ts`:

1. **Complete data loss** — server wiped, single client recovers all data
2. **Partial revert** — server reverted to older state, client preserves local data
3. **Accounts-only restore** — recommended recovery path with multi-client convergence
