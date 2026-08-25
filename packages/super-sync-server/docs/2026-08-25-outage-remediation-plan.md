# 2026-08-25 SuperSync Outage — Analysis and Remediation Plan

> **Publication scope:** this document names the production host, its unix account and groups,
> absolute paths, and the backup/reboot schedule. Following
> `docs/e2ee-legacy-data-eradication-plan.md`'s rule, those belong in a **private** operations
> runbook. The failure mechanism, the `health-alert.sh` bugs, and the remediation shapes are
> publishable; the identifying detail is not. Redact before committing, or keep untracked.

**Status:** revised after adversarial review (2026-08-25). Corrections from that review, and from production measurements taken after the first draft, are marked **[revised]**.
**Incident window:** 2026-08-25 01:04:34Z → 07:02:57Z (**5h 58m**)
**Host:** the production VPS — name kept in the private runbook (server local time = UTC+2 / CEST;
every timestamp below is server-local)
**Scope:** hosted `sync.super-productivity.com` only. No client-side or op-log change is proposed.
**User impact:** sync unavailable for all users (11,508 registered) for ~6 hours. No data loss observed or suspected — the database container stayed healthy throughout and no ops were lost, only undeliverable.

---

## 1. What happened

Four independent problems stacked. Only the first caused the outage; the others shaped how long it lasted and how badly it was reported.

### Timeline

| UTC            | Local          | Event                                                                                                                                                                                                    |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 08-24 22:00:38 | 08-25 00:00:38 | Health alert: `Connection pool 90% busy (54 of 60 running a query or in a transaction)`                                                                                                                  |
| 08-25 01:00:07 | 03:00:07       | App logs ×2: `Download ops error: Transaction API error: Unable to start a transaction in the given time.` Caddy shows request durations degrading 0.03s → 1.2s → 2.9s, many 429s and `status: 0` aborts |
| ~01:00         | 03:00          | **`backup.sh` starts** (`0 3 * * *` in `jo`'s crontab) — `pg_dump` of the whole database, piped to gzip                                                                                                  |
| ~01:00         | 03:00          | `unattended-upgrades` initiates reboot. `last -x`: `shutdown system down … 03:00 - 03:02`                                                                                                                |
| 01:02:22       | 03:02:22       | Host boots (kernel 6.8.0, unchanged). Prior uptime: 86 days                                                                                                                                              |
| 01:03:31       | 03:03:31       | `dockerd` starts                                                                                                                                                                                         |
| 01:04:34       | 03:04:34       | **`supersync` and `caddy` exit 128.** `postgres`, `dozzle`, `uptime-kuma` come up normally                                                                                                               |
| 01:05:36       | 03:05:36       | Health alert mails — with two reporting bugs that hid the cause (§1 RC4)                                                                                                                                 |
| 07:02:57       | 09:02:57       | Manual `docker compose up -d` restores service                                                                                                                                                           |
| 07:04:08       | 09:04:08       | `Cleanup [old-ops] failed: … canceling statement due to statement timeout` (§1 RC3)                                                                                                                      |

**The single biggest number in this incident is not in the failure chain: 5h 57m of it was waiting for a human.** The alert fired correctly, 90 seconds after the containers failed. Everything after that was response time. Any remediation that does not shorten it is optimising the wrong term. **[revised]** — see P0-A.

### Root cause 1 — the outage itself

`unattended-upgrades` is configured to auto-reboot:

```
/etc/apt/apt.conf.d/52unattended-upgrades-local:
  Unattended-Upgrade::Automatic-Reboot "true";
  Unattended-Upgrade::Automatic-Reboot-Time "03:00";
```

The reboot was clean and deliberate — the previous boot's journal ends with a full systemd shutdown sequence (`Reached target shutdown.target` → `Finished systemd-reboot.service` → `Journal stopped`). Not a crash, not an OOM (`OOMKilled=false`), not disk exhaustion (`/` at 67%, inodes 15%).

On the way back up, dockerd failed to start exactly two containers:

```
level=error msg="failed to start container" container=cc8765399f36… error="failed to create task
for container: failed to create shim task: OCI runtime create failed: runc create failed: unable
to create new parent process: unable to create safe /proc/self/exe clone for runc init:
could not seal fd: fcntl(F_ADD_SEALS): device or resource busy"
```

This is runc's CVE-2019-5736 defence (clone `/proc/self/exe` into a sealed memfd) failing. **Not a stale-version problem** — the host runs docker 29.4.2 / runc 1.3.5, both current. The surrounding dockerd log shows concurrent cleanup of stale state from the previous boot (`error locating sandbox id … not found`, `reading from a closed fifo`, `Deleting nftables IPv4 rules … No such file or directory`), consistent with a startup race that hit 2 of 5 containers.

**[revised] The backup and the auto-reboot are scheduled at the same minute.** `crontab -l`
for `jo` has `0 3 * * * flock -n /tmp/supersync-backup.lock .../backup.sh`, and
`Automatic-Reboot-Time` is `"03:00"`. So a full `pg_dump` of a 12 GB database on a disk doing
24 ms random reads was starting at the exact moment systemd began tearing the host down.

This is a **plausible but unproven** contributor to the runc race: a `docker exec pg_dump` in
flight makes the postgres container slow to stop, which is exactly the kind of unclean teardown
that leaves the stale state dockerd was cleaning up on the next boot. Unproven because the
shutdown-side detail is gone with the journal — but the collision needs fixing regardless of
whether it caused this, and it is trivially fixable (move one of the two).

**Second-order risk: the 2026-08-25 backup may be truncated.** `backup.sh` is
`pg_dump | gzip > "$BACKUP_FILE"` with no verification step, so a dump killed by the shutdown
leaves a partial `.sql.gz` that is indistinguishable from a good one by name or by `ls`. Verify
it before trusting it (§2 P0-D).

**Why nothing recovered:** the failure occurs at _task creation_, before the container ever runs. There is no exit for `restart: unless-stopped` to react to, which is why `docker inspect` reports `RestartCount=0`. The restart policy was never given a chance. Nothing else on the host retries, so the service stayed down until a human intervened ~6 hours later.

### Root cause 2 — capacity

**[revised] The "12 GB table" figure in the first draft was `pg_total_relation_size`, which is heap + TOAST + indexes.** Measured breakdown:

| Component                  | Size                         | Read by the failing queries?                |
| -------------------------- | ---------------------------- | ------------------------------------------- |
| `operations` heap          | **6,770 MB** (860,996 pages) | yes                                         |
| indexes on `operations`    | 3,292 MB                     | partially                                   |
| TOAST (`payload` overflow) | 1,911 MB                     | **no** — no failing query selects `payload` |
| **total relation**         | **11,973 MB**                |                                             |
| database total             | 12 GB                        |                                             |

| Metric                         | Value                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| host RAM                       | **4 GB** (1.2 GB used, ~2.0 GB page cache, 2.9 GB available) |
| swap                           | 1 GB, unused                                                 |
| postgres container `mem_limit` | **1,536 MB** (`docker-compose.yml:189`)                      |
| `shared_buffers`               | 384 MB                                                       |
| live rows in `operations`      | 8,646,315                                                    |
| Prisma pool                    | `connection_limit=60`, `pool_timeout=10`                     |

**[revised] The binding constraint is the cgroup, not the host.** Under cgroup v2, page cache is charged to the cgroup that faults it in. Postgres therefore cannot reach more than `mem_limit` (1,536 MB) of combined `shared_buffers` + file cache — roughly **1.1 GB of cache for a 6.77 GB heap (~16%)** no matter how much RAM the host has. This invalidates the first draft's "provision more RAM" item as written; see P1-C.

Cold random reads on this host measure **~24 ms per 8 KB block** (~330 KB/s) — roughly 240× slower than a consumer SSD. Measured directly by running the same `EXPLAIN (ANALYZE, BUFFERS)` twice, cold and warm:

| Run  | Execution time | `shared hit` / `read` | Heap blocks |
| ---- | -------------- | --------------------- | ----------- |
| Cold | **80,612 ms**  | 496 / 3,303           | 3,709       |
| Warm | **155 ms**     | 578 / 3,223           | 3,711       |

The `read` count is essentially unchanged between runs — those blocks were never in `shared_buffers` either time. The 520× difference is entirely OS page cache vs. platter. In both runs the _index_ scans finished in under 10 ms; all the time is heap I/O.

This single fact explains the 00:00 pool-busy alert, the 4-second `txDurationMs` on 4-op uploads, and the `Unable to start a transaction` errors. They are one cause, not four.

### Root cause 3 — retention fails on a cold cache

`Cleanup [old-ops]` failed 60.3 s after starting (scheduled 07:02:57.795Z, `INITIAL_CLEANUP_DELAY_MS` = 10 s, failed 07:04:08.094Z), cancelled by the `statement_timeout=60000` recovery guardrail documented in `env.example`.

The guardrail worked as designed — `env.example:86-92` records that without it, the 2026-07-20 outage had one bad plan hold a pool connection for 75 minutes and fail every user's sync.

The failing query is the fleet-wide `groupBy` in `StorageQuotaService.deleteOldSyncedOpsForAllUsers` (`storage-quota.service.ts:475`). `cleanup.ts:81-85` fires it **10 seconds after process start** — the coldest the page cache ever is. 3,711 random heap blocks × 24 ms ≈ 89 s against a 60 s ceiling.

**This is not chronic.** On a warm cache the same query takes 155 ms and succeeds. It fails after every reboot or container restart, which is precisely when it ran today.

**Log silence is ambiguous, so "it has been fine on other days" is not evidence.** `cleanup.ts:28-32` only logs when `totalDeleted > 0`; a successful run that deletes nothing is indistinguishable in the logs from a run that never happened. Separately, `scheduleDeferredReconciles` sits _after_ the `await` at `cleanup.ts:39`, so when the `groupBy` throws, the storage-counter reconcile for every affected user is skipped too.

### Root cause 4 — the alert mail hid all of this

The 01:05 alert read:

```
Container 'supersync' state:
Container 'caddy' state:
Database monitoring checks failed (exit 1)
Health endpoint returned HTTP 000000 (https://sync.super-productivity.com/health)
```

Three defects in `scripts/health-alert.sh`, all now fixed but **uncommitted**:

1. **`:387`** — `curl -sf … || echo "000"`. curl writes the code _and_ exits non-zero, so the fallback appended a second value. Verified against real curl: a connection failure gives `stdout=000 exit=7`, an HTTP error gives `stdout=404 exit=22`. So `000` became `000000`, and a real 502 would have printed `502000`.
2. **container check (~`:170`)** — `docker compose ps` without `-a` omits stopped containers, yielding an empty state. `-a` alone is NOT sufficient: `{{.State}}` renders a bare `exited`, so the `(128)` that named the runc failure still would not have reached the operator (verified against compose v5.4.0 — the code lives in `{{.ExitCode}}`, and `{{.Status}}` carries it only alongside a relative timestamp the dedupe normalizer does not strip). With `-a` **and** `{{.ExitCode}}` the mail would have read `state: exited (exit 128)` and named the root cause at 03:05 instead of 09:00.
3. **`:179`** — the OOM check runs `journalctl -k … 2>/dev/null`. For a user outside `adm`/`systemd-journal`, that prints a permission hint to stderr, emits nothing, and **exits 0** — so the check silently could never fire. The absence of an OOM alert was not evidence of no OOM.

Fixes are in the working tree with new regression tests (package suite 1216 passing). Not all of them fail against the original script: the empty-state, `HTTP 000000`, blind-OOM, `{{.ExitCode}}` and template-fallback cases do, and are the actual regression guards; the rest are design locks that document behavior the original already had (e.g. `|| echo "missing"` already covered a non-zero compose exit).

**No auto-recovery and no escalation exist.** The alert fired correctly at 01:05, was delivered to email only, and then nothing happened for six hours.

---

## 2. Remediation plan

Ordered by (impact on recurrence) ÷ (risk + effort). Each item states its verification.

**Sequencing constraint added in revision:** P1-A (index) must not ship before P1-B (VACUUM) and the dry run. See the warning in P1-A.

### P0-A — Shorten the response time **[revised — new, highest leverage; DONE 2026-08-25]**

**Problem:** 5h 57m of a 5h 58m outage was human response time. Nothing in the first draft addressed it.

`uptime-kuma` is **already deployed** (`docker-compose.monitoring.yml:37-39`) and attached to the internal network so it can probe `http://supersync:1900/health` directly. It appears to be unconfigured — it was one of the three containers that came up cleanly and it raised nothing.

**Change:** configure it. One HTTP monitor on `/health`, 60 s interval, and at least one notification channel that is **not** email — push (ntfy/Gotify/Pushover) or a phone-capable channel. Email at 03:05 is read at 09:00; that is the whole incident.

**Done 2026-08-25.** Two HTTP monitors (internal `http://supersync:1900/health`, public
`https://sync.super-productivity.com/health`), 60 s interval, 1 retry, resend every 10 checks while
down, cert-expiry alerts on the public one. Kuma already had an Email (SMTP) channel to the same
address as the cron mails — i.e. the same 6-hour-latency path — so an **ntfy push channel** was added
alongside it and applied to both monitors.

**Verify:** subscribe to the ntfy topic on a phone, then stop the `supersync` container deliberately;
confirm a push arrives within ~2 minutes and a recovery push on restart. **Until someone subscribes,
the push channel is inert** and the only live channel is still email.

**Risk:** near zero. No code change, no schema change, no production data touched.

**Note:** this is monitoring the operator's own infrastructure, not users — no user data is collected. It does not conflict with the project's no-telemetry rule, which is about the client.

### P0-B — Boot safety net

**Problem:** `unattended-upgrades` will reboot this host again on its own schedule, and the runc race can recur. Today that cost 6 hours.

**Change:** a systemd unit (preferred over `@reboot` cron — proper ordering on `docker.service`) that waits for dockerd, then converges the stack, with retries.

**[revised] The first draft's unit only brought up 3 of 5 containers.** `dozzle` and `uptime-kuma` live in a second compose file, so both files must be passed — otherwise a reboot silently leaves the monitoring that P0-A depends on down, which is the worst possible failure mode for this pair of changes.

```ini
# /etc/systemd/system/supersync-boot.service
[Unit]
Description=Ensure SuperSync stack is up after boot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/supersync/app_code/packages/super-sync-server
ExecStartPre=/bin/sleep 60
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Confirm the `-f` list matches however the stack is actually brought up on this host (a `COMPOSE_FILE` env var or a shell alias would change it) before installing.

**Verify:** `systemctl reboot` during a low-traffic window; confirm **all five** containers reach `running` without manual action, and that `/health` returns 200 within ~3 minutes.

**Risk:** low. `docker compose up -d` is idempotent against already-running containers. The `Restart=on-failure` + `RestartSec` gives the retry that the runc race needs; `Type=oneshot` means it exits after converging.

**Open question:** should this replace `restart: unless-stopped`, or complement it? Recommendation: complement — they cover different failure modes (task-creation failure vs. process exit).

### P0-C — Reduce the blast radius of auto-reboots

Auto-reboot itself should stay (unapplied security patches are worse). But 03:00 local is not obviously the quietest hour for a user base that skews European. Options, in order of preference:

1. Keep auto-reboot, rely on P0-B to make reboots a ~60-second blip. **Recommended.**
2. Move `Automatic-Reboot-Time` to a measured low-traffic hour (requires traffic data we do not currently collect per-hour).
3. Disable auto-reboot and patch manually. Rejected — trades a 60-second outage for unpatched CVEs and human toil.

**Verify:** P0-B's reboot test measures the actual blip length.

**[revised] Resolved — and the answer changes this item.** There IS a `pg_dump` at 03:00, in the
same minute as the reboot (§1 RC1). Regardless of which option above is chosen, **move one of the
two.** Cheapest fix, no trade-offs: shift the backup to `0 1 * * *` (or the reboot to `04:00`), so a
long dump can never be mid-flight when systemd starts killing containers.

`sudo crontab -l` is empty (no root cron); everything runs as `jo`. `/etc/cron.d/` holds only
`e2scrub_all` and `sysstat`, neither relevant.

### P0-D — Verify the backup, then separate it from the reboot **[revised — new]**

Two independent problems, both from the 03:00 collision (§1 RC1).

**1. Verify the 2026-08-25 dump.** `backup.sh` pipes `pg_dump` straight into `gzip` with no
integrity check, so a dump interrupted by the shutdown leaves a plausible-looking partial file.
`set -eo pipefail` means the script aborts before its retention sweep, so nothing good was deleted —
but the bad file is still sitting there looking valid.

```bash
cd /opt/supersync/app_code/packages/super-sync-server/backups
ls -lh supersync_20260825*.sql.gz            # anomalously small vs. neighbours?
gzip -t supersync_20260825_*.sql.gz && echo "gzip stream intact"
zcat supersync_20260825_*.sql.gz | tail -5   # a complete pg_dump ends with "-- PostgreSQL database dump complete"
```

Check the neighbouring days the same way — if 08-25 is the only bad one this is a one-off; if
several are bad, backups have been silently failing and that is a much bigger finding than this
incident.

**2. Move one of the two jobs.** Change the backup to `0 1 * * *`, or the reboot to `04:00`. One
line, no trade-off, and it removes the collision permanently.

**3. Consider adding verification to `backup.sh`** so this is self-detecting: `gzip -t` the file and
assert the dump's trailer is present, failing loudly if not. An unverified backup is a backup you
find out about during a restore. Not urgent, but it is the cheapest possible insurance and belongs
in the repo rather than in an operator's head.

### P1-A — Add a partial index matching the causal predicate

> **⚠ [revised] This is not purely a performance fix. Do not ship it before the dry run.**
> The `groupBy` at `storage-quota.service.ts:475` is the _first_ statement of `deleteOldSyncedOpsForAllUsers`. While it times out, the destructive phase never runs. Making it fast **arms a delete path that has not completed in an unknown number of days**, which will then remove up to `OLD_OPS_CLEANUP_MAX_DELETED_PER_RUN = 25,000` rows per run (`storage-quota.service.ts:38`). Run `scripts/dry-run-old-ops-sweep.ts` and read its output _before_ the migration, not after.

**Problem:** `CAUSAL_FULL_STATE_OPERATION_WHERE` (`sync.types.ts:25`) is

```
(op_type IN ('SYNC_IMPORT','BACKUP_IMPORT')) OR (op_type = 'REPAIR' AND repair_base_server_seq IS NOT NULL)
```

but the existing partial index `operations_user_id_full_state_server_seq_idx` has the broader predicate `op_type IN ('SYNC_IMPORT','BACKUP_IMPORT','REPAIR')`. The planner _does_ use it (verified — a predicate-implication failure was hypothesised and disproven), but because `repair_base_server_seq` is not in the index, every candidate row needs a heap fetch. That is the 3,711 blocks and the 80 seconds.

**Change:** one migration adding an index whose predicate matches the causal condition exactly. **No application code changes.**

```sql
DROP INDEX CONCURRENTLY IF EXISTS "operations_user_id_causal_full_state_seq_idx";
CREATE INDEX CONCURRENTLY "operations_user_id_causal_full_state_seq_idx"
  ON "operations"("user_id", "server_seq")
  WHERE "op_type" IN ('SYNC_IMPORT','BACKUP_IMPORT')
     OR ("op_type" = 'REPAIR' AND "repair_base_server_seq" IS NOT NULL);
```

The drop-then-create shape is deliberate: `prisma/migrations/README.md` documents it as the **only** form the deploy script will auto-recover after an interrupted concurrent build.

Measured in a local Postgres lab (PG15, 400k synthetic rows, ~1% full-state) against the **unmodified** application query:

| Index                        | Plan                                       | Buffers | Heap fetches |
| ---------------------------- | ------------------------------------------ | ------- | ------------ |
| Current (broader predicate)  | Bitmap Heap Scan (+ duplicated `BitmapOr`) | 821     | 814 blocks   |
| Exact-match causal predicate | **Index Only Scan**                        | **5**   | **0**        |

**[revised] The lab's 0 heap fetches will not reproduce on production until P1-B runs.** The lab table was freshly loaded, so its visibility map was 100%. Production is at 82.8% (`relallvisible` 712,548 / `relpages` 860,996): ~148,000 pages are not all-visible, and every index entry landing on one still costs a heap fetch — at 24 ms each, potentially enough to stay over the 60 s ceiling. **P1-B is a prerequisite, not a companion.**

**Why this and not the query rewrite I first proposed.** The obvious alternative — widen the SQL to `op_type IN (3 values)` and drop non-causal REPAIRs in JS — is **incorrect and would risk data loss**. The aggregate is `max(server_seq)` per user; if a non-causal REPAIR (null `repair_base_server_seq`) is the newest full-state row for a user, the widened query returns _its_ seq as the max, and post-filtering in JS cannot recover the correct causal maximum without a second query. That would authorise deleting operations below a boundary that is not a proven causal boundary. Changing the index instead leaves the semantics untouched — the safest possible version of this fix, per the repo's sync-correctness rules.

**Bonus:** `OperationDownloadService.getOpsSinceWithSeq` (`operation-download.service.ts:168`) uses the same `CAUSAL_FULL_STATE_OPERATION_WHERE` on the hot download path, so it benefits too.

**Verify:** on production, after the migration, `EXPLAIN (ANALYZE, BUFFERS)` on the cleanup query must show `Index Only Scan` with low `Heap Fetches`. Locally, existing integration coverage (`old-ops-sweep.integration.spec.ts`) must stay green — the query is unchanged, so a behaviour change would indicate a mistake.

**Risks:**

- `CREATE INDEX CONCURRENTLY` on a 6.77 GB heap with 24 ms cold reads will run for a long time and generate sustained I/O. **Must be scheduled in a low-traffic window.**
- **[revised] The default deploy budget is too small.** `deploy.sh:288` defaults `MIGRATION_TIMEOUT=900`s, and `deploy.sh:295-296` derives `MIGRATE_STEP_TIMEOUT = MIGRATION_TIMEOUT - 30`, from which `migrate-deploy.sh:102-108` derives a Postgres `statement_timeout` 5 s shorter again — an effective **865-second ceiling** on the index build. Raise `MIGRATION_TIMEOUT` (the single knob; it forwards to the other two) to a value that comfortably covers the build. The first draft named the wrong knobs.
- An interrupted `CREATE INDEX CONCURRENTLY` leaves an **invalid index that is still maintained on every insert**. Health-alert check 8 exists precisely to catch this — confirm it is passing after the migration.
- **Unresolved from review:** whether to add this as a second index or instead rebuild the existing one with `INCLUDE ("repair_base_server_seq")`. A second index costs ~write amplification on every op insert on an already I/O-starved host; a rebuild avoids that but is a bigger, less reversible step. Needs a clean PG16 lab re-run (the lab above was PG15) before choosing. **Interim recommendation: add the second index, measure, then decide whether to drop the broader one.**

### P1-B — Refresh and maintain the visibility map **(prerequisite for P1-A)**

**Problem:** the visibility map only advances on VACUUM.

```
last_autovacuum:  2026-08-22 23:35   (3 days before the incident)
n_dead_tup:       197,299   /  n_live_tup: 8,646,315   →  2.3% dead
relallvisible:    712,548   /  relpages:   860,996     →  82.8% coverage
```

2.3% dead is far below the default `autovacuum_vacuum_scale_factor` of 0.2, so autovacuum will not run again for a long time and the map will keep drifting.

**Change:**

1. One-off `VACUUM (ANALYZE, VERBOSE) operations;` in a quiet window. It skips already-all-visible pages, so the work is bounded by the ~148,000 non-all-visible pages (~1.16 GB), not the whole heap — but it will still be I/O-heavy on this disk.
2. Per-table autovacuum tuning so the map stays current on an insert-heavy table, e.g. `ALTER TABLE operations SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_insert_scale_factor = 0.02);`

**Verify:** re-run `relallvisible / relpages` immediately after (expect >99%) and again after several days (expect it to stay high). Then re-run the cleanup query's `EXPLAIN` and confirm `Heap Fetches` is low.

**Risk:** medium-low. More frequent autovacuum means more background I/O on a host that is already I/O-starved. Values above are a starting point and should be tuned against observed `last_autovacuum` cadence, not set and forgotten.

### P1-C — Raise the Postgres memory ceiling **[revised — first draft was inert]**

**Problem:** §1 RC2. ~1.1 GB of reachable cache for a 6.77 GB heap.

**[revised] The first draft said "buy more host RAM". On its own that changes nothing.** `docker-compose.yml:189` caps the postgres container at `mem_limit: 1536m`, and cgroup v2 charges page cache to the cgroup — so Postgres's reachable cache stays ~1.1 GB on a 4 GB host and on a 64 GB host alike. **The `mem_limit` is the lever; host RAM is only what makes raising it possible.** Do both or neither:

1. Increase host RAM (4 GB → 8 GB is the obvious step).
2. **Then** raise the postgres `mem_limit` to consume it, and update the "Tuned for the 1.5g mem_limit" comment at `docker-compose.yml:142` and `effective_cache_size` at `:157` to match.

**Explicitly rejected:** raising `shared_buffers` alone. At 384 MB it is already above the stock 128 MB; going to 1 GB inside an unchanged 1,536 MB cgroup would take ~640 MB _from_ the container's page cache to hold a different ~9% of the heap. Double-buffering, no net win. **Not the lever.**

**Verify:** confirm the new ceiling is real before claiming the fix — `docker stats supersync-postgres` should show cache growing past the old limit under load, and the cold-cache `EXPLAIN` on the cleanup query should improve materially.

**Shipped (2026-08-25):** the _mechanism_, not the raise. Both values moved behind
`POSTGRES_MEM_LIMIT` / `POSTGRES_EFFECTIVE_CACHE_SIZE` with the **released values as the
defaults** (1536m / 1GB), so step 2 stays opt-in and "do both or neither" is not quietly
violated by the repo shipping a 4 GB-host tuning to every self-hoster. Two side effects worth
knowing: raising either knob recreates the postgres container (they feed one config hash), and
`effective_cache_size` is a startup parameter — so production's live `docker update --memory
2048m` is half-inert until that restart. Sequence the raise after P1-A's index, which is what
makes the cold-cache cleanup query survivable.

### P1-D — Retention throughput is capped far below the growth rate **[revised — new]**

Raised by review; **the specific counts below come from the review and have not been independently re-measured** — the dry run is what settles them.

- Only ~2,822 of 11,508 users (~24.5%) hold a causal full-state boundary at all. For the rest, `deleteOldSyncedOpsForAllUsers` can prune nothing, no matter how fast the query gets.
- `OLD_OPS_CLEANUP_MAX_DELETED_PER_RUN = 25,000` (`storage-quota.service.ts:38`) with one run per day caps deletion at ~0.29% of 8.6M rows per day.

If both hold, P1-A and P1-B make retention _work_ but not _keep up_, and the table keeps growing. That would make P1-C load-bearing rather than optional, and would put retention policy back on the table as a real decision rather than a deferred one.

**Verify:** `scripts/dry-run-old-ops-sweep.ts` (read-only; verified) reports would-delete counts per user. Run it off-peak — its base CTE is a full aggregate scan of the 860,996-page heap and will churn the ~1.1 GB of cache the site depends on.

**No change proposed here yet** — this is a measurement item. Deciding what to do about it is a product decision (see §3).

### P2 — Commit the `health-alert.sh` fixes

Three fixes plus six regression tests are in the working tree, unreviewed and uncommitted. Detail in §1 RC4.

**Verify:** `npx vitest run` in `packages/super-sync-server` (1201 passing as of writing).

**Open questions for the maintainer:**

- Clamp multi-line `STATE` with `head -1`? **Corrected:** this exposure did NOT predate the change. `docker compose ps --help` says `-a` shows "all stopped containers (**including those created by the run command**)" — without `-a` a leftover one-off is excluded entirely, so `-a` is what introduces it. **Still open, accepted:** `head -1` picks a row whose order is undocumented (compose appears to sort by name, so `<proj>-<svc>-1` precedes `<proj>-<svc>-run-<hex>`, but that is not contractual). Ceiling: a crashed replica beside a healthy one reads as healthy. Accepted because both `docker compose run` call sites in `deploy.sh` (`:330`, `:402`) pass `--rm`, so a leftover requires a hard kill mid-migration, and multi-container services do not occur in this deployment. Upgrade path if either changes: add `{{.Name}}` to the format and drop rows matching `-run-`.

**[revised twice] Was called a deploy BLOCKER; it is not, and the reasoning behind that label was
wrong.** The first fix routed "OOM check unavailable" into `PROBLEMS`, and `jo`'s `groups` is
`jo sudo users docker` — no `adm`, no `systemd-journal` — so it would have fired on every run.
The claim that this "suppresses every subsequent alert and the next container failure is silent"
was **incorrect**: the dedupe key is a sha256 of the _normalized content_ of `PROBLEMS`
(`health-alert.sh:426-433`), not a boolean, so a new problem changes the hash and still mails.

What it would actually have broken is narrower but still real: `[ -n "$PROBLEMS" ]` gates the
recovery branch, so `Health Check Recovered` could never be sent again, `ALERT_STATE_FILE` would
never clear, and every alert body would carry a permanent false line — with the recovery transition
arriving under a subject reading "Health Check Failed".

`health-alert.sh:120-123` already stated this rule for the missing-`mail` case ("never in
CONFIG_PROBLEMS, which is the alert body and the dedupe hash input"). The `/simplify` review caught
that the OOM branch violated the file's own documented convention. **Fixed:** an unreadable kernel
log now writes `.health-alert/oom-check-blind` and `deploy.sh` surfaces it beside `mail-failed`.
This also matters for shipped self-hosters — `Dockerfile:60` ships `scripts/`, and on a non-systemd
host `journalctl` is absent entirely, where the old branch would have fired forever with
remediation advice that does not apply.

Pinned by `tests/health-alert-script.spec.ts` ("still sends the recovery mail on a host whose kernel
log is unreadable"), verified to fail against the pre-fix script.

```bash
sudo usermod -aG adm jo     # then log out and back in
groups                      # must now list adm
/opt/supersync/app_code/packages/super-sync-server/scripts/health-alert.sh   # must not report the OOM line
```

Cron picks up new group membership on its next session, so no cron restart is needed — but verify
with a manual run before trusting it. Uptime-kuma (P0-A) is now an independent second channel, which
makes this less catastrophic than it would have been, but it is still a hard prerequisite.

### P3 — Consider auto-recovery in the alert script

The container-down branch could attempt one `docker compose up -d` before mailing. That would have turned this into a ~5-minute outage even without P0-B.

**Deliberately ranked below P0.** A systemd unit is the right place for boot convergence; putting recovery logic in a monitoring script risks it fighting a deploy in progress, or masking a crash-loop that should page a human. If P0-B ships, this may not be worth doing at all.

### P3 — Make retention outcomes visible

`cleanup.ts:28-32` logs only when `totalDeleted > 0`, so a successful zero-delete run and a run that never happened look identical (§1 RC3). A single unconditional info line per pass — deleted count, affected users, elapsed ms — would have answered "has this been failing for weeks?" in one grep. Cheap, and it closes the largest gap in §4.

### Parked — Prisma `maxWait`

`maxWait` is never set anywhere in the codebase (`grep -rn 'maxWait' src/` → zero hits), so it defaults to **2000 ms** (confirmed against Prisma 5.22 docs), while every sync transaction sets `timeout: 60000` and the URL sets `pool_timeout=10`. The 10 s pool timeout is therefore unreachable for interactive transactions — the 2 s `maxWait` always fires first. The 01:00:07 `Unable to start a transaction in the given time` errors are that 2 s deadline.

**Not being changed now.** On an I/O-starved host, raising `maxWait` converts fast failures into slow ones and holds pool connections _longer_, which is the wrong direction. Revisit after P1-C, with the asymmetry (2 s to acquire vs 60 s to run) as the thing to reconsider.

### Parked — cleanup schedule drift

`cleanup.ts:81-90` fires the first pass 10 s after process start, then every 24 h — so the daily cleanup's wall-clock time is anchored to the last restart and drifts into peak hours over time. Raising `INITIAL_CLEANUP_DELAY_MS` alone was considered and **rejected as a standalone fix**: it makes the cold-cache failure less likely without making the query affordable, and it does not stop the drift. A real fix pins the pass to a configured off-peak hour. Not urgent once P1-A and P1-B land.

---

## 2b. Incidental finding — legacy plaintext snapshot blobs (NOT an outage item)

Surfaced while measuring the sweep's blast radius on 2026-08-25. **Unrelated to the outage, predates
it, and must not be bundled into the remediation.** Recorded here because it was measured here.

### Measured

| metric                                                  | value           |
| ------------------------------------------------------- | --------------- |
| `user_sync_state` rows with `snapshot_data IS NOT NULL` | **3,110**       |
| of those, with **no** causal full-state boundary        | **2,129** (68%) |
| total blob size                                         | **87 MB**       |
| users holding operations                                | 10,027          |
| users with a causal boundary                            | 2,830 (28.2%)   |
| of those, actually snapshot-capped                      | 38 (1.3%)       |

### Why the blobs are necessarily plaintext-derived

`snapshot-generation.service.ts:455-464` counts `isPayloadEncrypted: true` ops in the window and
throws `EncryptedOpsNotSupportedError` if any exist. A cached blob can therefore only ever have been
produced from unencrypted operations. This matches the eradication plan's own framing of them as
"derived application-state snapshots" and its completion criterion that
`user_sync_state.snapshot_data` be "null everywhere".

87 MB is not a capacity problem. This is a data-minimization / privacy item on a privacy-first
project, and it is the operator's policy call — not an engineering defect to fix in this PR.

### Two code assumptions the measurement falsifies

1. **"Almost nobody holds a blob."** `storage-quota.service.ts:455-458` reasons that under the
   mandatory-E2EE gate `lastSnapshotSeq` "can no longer advance for anyone"; `cleanup.ts:118-121`
   concludes blob holders are "almost nobody" and therefore everyone "ties and drains in userId
   order." The cohort is 3,110. The _conclusion_ about drain order still holds (2,830 boundary
   holders, of whom only 38 are capped), but it is holding by luck rather than by the stated reason.
2. **"Bounded and shrinking as eradication proceeds."** `storage-quota.service.ts:492`. Eradication
   has not started, and 68% of the cohort cannot shrink through retention at all: the only automatic
   blob-clearing path (`storage-quota.service.ts:840-855`) requires the sweep to have deleted ops for
   that user, which requires a causal boundary they do not have.

### What this implies for the eradication plan

Its Step 3 cannot rely on the retention sweep to drain `snapshot_data` as a side effect. For 2,129
users it must clear blobs directly. That is a plan correction, not a code change.

**Not proposed here, and deliberately so:** a bulk `UPDATE user_sync_state SET snapshot_data = NULL`
for boundary-less users. It is one statement, but the consequences are unverified — `generateSnapshotAtSeq`
uses the cached blob as a replay base for historical restore points, and whether regenerating from ops
is merely slower or actually unavailable for these users has **not** been checked. Do not run it on
the strength of this section.

**Suggested next step:** raise as its own issue against the eradication plan with the four numbers
above. Keep it out of the outage branch.

## 3. What is explicitly not proposed

- **No client, op-log, or sync-protocol change.** Nothing in this incident implicates operation semantics, vector clocks, or conflict resolution.
- **No schema version bump.** Nothing here changes op semantics (rule 10).
- **No change to the cleanup query itself** — see P1-A's correctness note.
- **No retention-policy change.** Whether 45 days (`RETENTION_MS`) is still right at 8.6M rows is a product decision, out of scope for an incident fix — but P1-D may force it back onto the agenda.
- **No runc/docker upgrade** — both are current; a version bump would be cargo-culting.
- **No new telemetry.** P0-A monitors the operator's own container, not users.

## 4. Confidence and gaps

**Confidence in the diagnosis: high (~95%).** Every link in the failure chain is measured rather than inferred: the reboot from `last -x` and the apt config, the failed restore from the dockerd log, the disk latency from two `EXPLAIN`s with opposite cache states, the capacity ceiling from `pg_relation_size` vs. the container `mem_limit`, and the visibility-map state from `pg_class`.

**Confidence in the remediation: lower (~75%)**, and the first draft is why. Three of its items were wrong in ways only review caught — the RAM item was inert against the cgroup cap, the systemd unit missed two containers, and the index item was framed as a pure performance fix when it also arms a destructive delete path. Treat the remaining unresolved items below as real, not as formalities.

**Known gaps:**

- The exact trigger of the runc `F_ADD_SEALS` race is not established — only that it happened, hit 2 of 5 containers, and coincided with dockerd cleaning up stale post-boot state. P0-B mitigates it without needing the mechanism. If it recurs after P0-B, this needs a real upstream investigation.
- Whether `Cleanup [old-ops]` has been failing on previous days is **unknown** — the pre-restart container's logs are gone, and a zero-delete success logs nothing (§1 RC3). The cold-cache theory predicts it succeeded on warm days, but that is inference, not evidence. P3 "make retention outcomes visible" exists to close this.
- The 00:00:38 local pool-busy alert (54/60), and the second one at 08:00:18Z (52/60, recovered 08:05:07Z), are attributed to general I/O starvation, plausibly amplified by the deferred storage reconciles (`cleanup.ts:110`, one `calculateStorageUsage` scan per 5 s for up to an hour). **Not proven** — the correlating logs are gone. The 08:00 alert is notable because it fired ~1 h after the restart, i.e. while the cache was still cold.
- P1-D's user and row counts come from review, not from a run of the dry-run gate. They change the priority of P1-C if confirmed.
- Whether a `pg_dump` or similar cron overlaps the 03:00 reboot window is unchecked (P0-C).
- Whether the second index or an `INCLUDE` rebuild is correct for P1-A is unresolved and needs a PG16 lab run.
