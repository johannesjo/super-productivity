# Backup & Disaster Recovery

## Architecture Context

Super Productivity uses an append-only operation log for sync. Every client (desktop, mobile, web) keeps a full copy of its data in local IndexedDB. The server is a relay — **clients are the source of truth**, not the server.

Clients can recover ordinary task state when a complete device copy survives.
Pending agent captures and their delivery ledger are server-only data; a device
backup cannot reconstruct captures that never reached a device.

## What the Backup Protects

| Data                                           | Where it lives             | Why back it up                                   |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------ |
| User accounts (email, password hash)           | Server only                | Users can't authenticate without this            |
| Capture queue, receipts and publisher counters | Server only                | Preserve accepted captures and delivery identity |
| Passkeys (WebAuthn credentials)                | Server only                | Can't be regenerated                             |
| Operation log                                  | Server + all clients       | Last resort if all client devices are lost       |
| Task/project/tag data                          | Derived from operation log | Clients reconstruct from ops                     |

## Backup Setup

### Daily Automated Backup

The backup script creates two dumps:

- **Full dump** (`supersync_*.sql.gz`) — complete database including all operations (~300MB+ for active instances)
- **Accounts recovery dump** (`supersync_accounts_*.sql.gz`) — `users`, `passkeys`,
  `agent_capture_accounts`, and `agent_captures` in one consistent snapshot. The
  filename is retained for existing automation; this dump excludes operations
  and snapshots. Its size also depends on the pending capture queue.

Both dumps contain credentials and **plaintext capture titles/notes** pending
publication. The script uses private file permissions; apply the same access and
retention controls to off-site copies. Publication clears the live title/notes,
not copies already in backups. Dumps made before this change contain only users
and passkeys in the accounts file and cannot recover the capture ledger.

```bash
# Run manually
./scripts/backup.sh

# Set up daily cron at 3 AM with 3-day retention. flock keeps a slow dump from
# overlapping the next night's run. The lock must live in a root-owned dir like /run —
# in world-writable /tmp any local user could squat the path and silently block every
# nightly run.
(crontab -l 2>/dev/null; echo "0 3 * * * RETENTION_DAYS=3 flock -n /run/supersync-backup.lock /path/to/scripts/backup.sh >> /var/log/supersync-backup.log 2>&1") | crontab -
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

1. If capture has ever been used, follow [Capture restore hold](#capture-restore-hold)
   before reconnecting clients.
2. Restore the accounts recovery dump (credentials + capture ledger)
3. Sync data (operations, snapshots) starts empty
4. When clients reconnect, gap detection fires automatically
5. Each client re-uploads its full state to the server
6. Ordinary task state converges; capture delivery stays paused pending reconciliation

**Steps:**

```bash
# Restore into the prepared recovery database while application servers are stopped.
# For capture-enabled deployments, complete the capture restore hold below first.
gunzip -c backups/supersync_accounts_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i supersync-postgres psql -U supersync supersync

# Reconnect clients only after verifying the restored schema and capture pause.
```

**Why this is preferred:**

- Avoids `SYNC_IMPORT_EXISTS` conflicts that occur with partial restores
- Clients hold ordinary task state; the dump preserves the server-only capture ledger
- Produces a clean, consistent server state
- Verified by e2e tests (`supersync-server-backup-revert.spec.ts`)

### Fallback: Full Database Restore

Use this only if **all client devices are lost** (no client can re-upload data).
If capture has ever been used, follow [Capture restore hold](#capture-restore-hold)
before restarting the server.

```bash
# 1. Stop the server
docker compose stop supersync

# 2. Drop existing data and restore the full dump
docker exec -i supersync-postgres psql -U supersync supersync \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c backups/supersync_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i supersync-postgres psql -U supersync supersync

# 3. Recreate the server with the recovery environment (capture delivery disabled).
docker compose up -d --force-recreate supersync
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

## Capture restore hold

This applies to full and accounts recovery, including per-user reconstruction.
It prevents automatic capture publication while evidence is being reconciled;
it is not an automatic reconciliation mechanism. The switch is deployment-wide,
so unresolved accounts keep capture delivery paused for the whole deployment.
Ordinary task sync may resume separately once its recovery is verified.

The encrypted browser restore regression demonstrates why this hold is required:
with delivery still enabled, a restored pending capture publishes a new operation
for the same task ID. The surviving device retains its edit or deletion, while a
fresh device recovers the original title. A stable task ID alone does not preserve
those changes across recovered clients.

1. Stop every application server/replica and exclude traffic **before** restoring.
   Let in-flight requests stop; changing a setting cannot undo a committed request.
   Preserve the pre-recovery database, available backups and device copies before
   overwriting anything. Record the selected snapshot time and incident interval.
2. Set `ENABLE_AGENT_CAPTURE_DELIVERY=false` in the deployment environment outside
   the restored database (Helm: `supersync.agentCaptureDeliveryEnabled=false`).
   Verify every replica uses it. With Compose, recreate containers after changing
   the environment; `docker compose start` or `restart` retains their old environment.
3. Restore into an isolated database and check the capture tables alongside the
   account data. An older accounts-only dump lacks them: do not interpret missing
   tables as an empty queue. Preserve an available full dump and determine what
   capture evidence it contains before allowing capture to resume.
4. Before opening traffic, use a disposable app account to verify authenticated
   `/api/sync/ops` advertises `capabilities.captureDelivery=false` and both
   `/api/sync/captures/pending` and `/api/sync/captures/publish` return `503`.
   A client that cached the earlier capability must also be refused on publication.
5. Inventory capture IDs and receipt metadata per account without copying titles,
   notes, credentials or encryption keys into incident logs. Handle recovery
   artifacts as private user data. Reconcile the interval after the chosen backup
   against evidence retained outside the rollback and affected users' decisions.
6. Record each outcome with `npm run capture-restore -- resolve` and clear the
   hold only once `npm run capture-restore -- status` exits 0. See
   [Recording outcomes and clearing the hold](#recording-outcomes-and-clearing-the-hold).

| Evidence                                             | Required handling                                                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restored terminal receipt                            | Keep it terminal even if its operation is absent or its sequence exceeds the recovered log. Pruning, imports and accounts recovery legitimately leave such receipts.    |
| Restored pending row                                 | Treat delivery as unknown until independently established. Its title/notes are historical input, not proof that it was never delivered.                                 |
| No task or capture actor on one device               | Insufficient evidence: the user may have edited/deleted/imported the task, and bounded clocks may have pruned the actor.                                                |
| Confirmed publication after the backup               | Preserve the retained operation/receipt identity and resulting user changes; reconcile the account's publisher counter as well. Do not turn it into a fresh submission. |
| Missing queue/receipt evidence or an unresolved item | Keep capture paused. Obtain the user's explicit resolution rather than silently deleting or replaying accepted work.                                                    |

**Resumption remains a release gate.** Before enabling delivery, the maintainer
must have an account-by-account recovery record covering all restored pending
items, any accepted submissions absent from the snapshot, terminal receipts,
publisher counters and relevant account/key generations. Restored counters and
generations may also have rolled back; neither bumping them nor resetting the
account determines whether an individual capture was delivered. Never fabricate
receipt IDs or sequences to hide an unresolved item.

### Recording outcomes and clearing the hold

`npm run capture-restore` records the outcomes you established in step 5 and
gates resumption on them. It does **not** reconstruct missing evidence: nothing
in the restored rows can tell delivery from non-delivery, which is why every
resolution is an operator command rather than an automatic repair.

```sh
# The resumption gate. Exits 1 while any capture is unresolved.
npm run capture-restore -- status

# One recorded outcome per ambiguous item, after you established it.
npm run capture-restore -- resolve <userId> <captureId> delivered_out_of_band
npm run capture-restore -- resolve <userId> <captureId> discarded_by_user
```

- `delivered_out_of_band` — evidence outside the rolled-back database shows this
  capture was published. It also advances the account's publisher counter by one,
  reclaiming the clock value that the erased publication already consumed on
  devices; resuming from the rolled-back counter would mint a second operation
  claiming the same publisher entry.
- `discarded_by_user` — the user decided this capture must not be published.
  Nothing was consumed, so the counter does not move.

Both clear the stored title and notes, exactly as publication does, and make the
row terminal **without** an invented operation identity. Neither can be undone,
and neither overwrites a recorded outcome or a terminal receipt: a repeated
command reports what is already stored. The tool prints only user IDs, capture
IDs and counts.

The command does not verify that the hold is in place — that is step 2's job. A
capture that publishes before you resolve it is safe (the row is locked and the
receipt wins), but resolving a genuinely pending capture on a running deployment
would drop real work. Run this only while delivery is paused.

Rehearse the chosen reconciliation on an isolated restore and verify ordinary
replay on surviving and fresh clients before approving it for an incident. Resume
only after `status` is clean and the deployment switch is deliberately enabled.
If the required evidence cannot be recovered, keep delivery disabled; this
procedure does not authorize data loss.

The real dump/restore regression is
`tests/integration/agent-capture-backup.integration.spec.ts`. It verifies that the
accounts artifact restores pending content, terminal receipts, recorded
resolutions, publisher counters, account generation and passkeys, excludes the
operation log, and remains private.
Run with `DATABASE_URL` and `BACKUP_TEST_DB_CONTAINER` pointing to the same isolated
PostgreSQL container; the canonical PostgreSQL CI job supplies both. The delivery
route suite separately verifies the pause responses.

The browser characterization is `e2e/tests/sync/agent-capture-restore.spec.ts`.
From the repository root, with the E2E frontend running and an isolated PostgreSQL
database already migrated, run:

```bash
DATABASE_URL=postgresql://capture:capture@127.0.0.1:55439/capture \
CAPTURE_RESTORE_E2E=true SUPERSYNC_E2E_URL=http://127.0.0.1:1903 \
E2E_BASE_URL=http://127.0.0.1:4242 E2E_REQUIRE_SUPERSYNC=true \
  npx playwright test --config e2e/playwright-capture-restore.config.ts --retries=0
```

Use an unused local backend port. The spec starts and restarts its own server,
restores only its test accounts, and skips without the explicit opt-in. Its runner
skips the normal pre-existing-backend health check and unrelated plugin build;
shared packages and the Prisma client must already be built/generated. Passing
records the unsafe behavior; it does not authorize resumption.

## Per-User Recovery (single account wiped)

The procedures above recover the **whole server**. A different situation: one
user's account is wiped — usually because a bad `SYNC_IMPORT` propagated an
empty or stale snapshot across their devices — and you need to roll _that one
user_ back to a point in time.

**Check the affected devices first.** Every client keeps local recovery
points: right before it applies a remote full-state op (`SYNC_IMPORT`,
`BACKUP_IMPORT`, `REPAIR`), before "Use server data", and before an import,
it snapshots its complete state into a ring of three. The user opens
**Settings → Sync & Backup → Import/Export → Browse backups** on the device
that held the data when the wipe arrived, picks the entry labelled "before
sync replaced local data", and restores it. That restore is a normal local
import, so it uploads as a new full-state op and repairs the other devices
on their next sync. This works for encrypted accounts and needs nothing from
the server. See `docs/sync-and-op-log/local-recovery-points.md`.

Only if no device has a usable recovery point, fall back to the server-side
options below.

The in-app **Restore from History** handles this for unencrypted accounts. It
does **not** work for E2E-encrypted accounts: the server cannot decrypt the op
payloads, so `generateSnapshotAtSeq` throws `EncryptedOpsNotSupportedError`.

### Diagnosing an encrypted download failure

When an encrypted account fails to sync with a decryption error, do not assume
the passphrase is globally wrong: one corrupt operation rejects its whole
download batch with the same user-facing error. The client classifies the
failing batch itself — ask the affected user for the
`Encrypted operation batch could not be processed` entry from the exported
Logs (**Settings → Logs**, an ordinary build). It contains only safe metadata:
the failing operations' `serverSeq`/`opId`/failure stage/`errorName`,
decrypted and parsed counts, and `passwordEvidence`. It never contains the
passphrase, token, ciphertext, or decrypted content.

Interpret `passwordEvidence` conservatively. `confirmed-for-some-operations`
means the key decrypted at least one operation in that run, which rules out a
globally wrong passphrase and points at the listed operations.
`no-operation-decrypted` is **inconclusive**: a wrong passphrase, a wholly
corrupt or differently keyed range, and a device that could not run
decryption at all produce the same shape — read each failure's `errorName`
case by case. `OperationError` is an AES-GCM authentication failure (wrong
key or corrupt data), and devices without WebCrypto report the same
authentication failure as a bare `Error` (fallback crypto).
`InvalidCiphertextError`/`InvalidCharacterError` mean truncated or mangled
ciphertext, and `WebCryptoNotAvailableError` is an environment failure —
neither is password evidence.

### Recovering a mixed encrypted/plaintext history

An encryption-enabled client that logs
`received a plaintext op while encryption is mandatory` is not reporting a
wrong passphrase. It has found a plaintext row in an account that is expected
to contain only encrypted payloads. The client rejects the complete download
without applying its valid prefix or advancing its durable cursor.

If an **updated** client still has a verified complete, current copy of the
account, use the supported client recovery:

1. Keep every other client offline and preserve the complete client unchanged.
2. Export a full backup from that client and protect it as plaintext user data.
3. In its sync settings, open **Advanced** and choose **Force Overwrite**.
4. Wait for the encrypted clean-slate upload to finish before updating and
   reconnecting the other clients one at a time.
5. Verify the reconstructed data on a fresh client before deleting the backup.

Force Overwrite deletes the mixed operation dataset and uploads the selected
client's state as an encrypted full-state operation while preserving server
sequence monotonicity. Do not run it from a fresh, incomplete, stale, or
pre-fix client.

Do **not** recover by changing `isPayloadEncrypted`, applying or skipping the
plaintext row, deleting that row alone, or advancing a client cursor past it.
The flag and surrounding envelope are unauthenticated, so those shortcuts can
apply forged data or silently construct an incomplete state. If no client has
a verified complete copy, preserve the clients and database, inspect only safe
row metadata first, and treat any server-side reconstruction as an incident
recovery against an isolated database restore rather than a normal sync path.

The real-shape recovery regression is
`e2e/tests/sync/supersync-plaintext-history-recovery-9439.spec.ts`.

`scripts/recover-user.ts` fills the encrypted-recovery gap. It replays the user's operation log up
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
4. **Mixed encrypted/plaintext history** — fail closed, then recover through an encrypted trusted-client Force Overwrite
