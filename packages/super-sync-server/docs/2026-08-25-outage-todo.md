# 2026-08-25 Outage — Step-by-step TODO

> **Publication scope:** this file is operational and names this deployment's host, paths and
> schedule. Mirrors `docs/e2ee-legacy-data-eradication-plan.md`'s rule — concrete hostnames,
> account names, backup schedules and secrets belong in a **private** runbook, not a public repo.
> Redact those before committing, or keep this file untracked.

Companion to [`2026-08-25-outage-remediation-plan.md`](2026-08-25-outage-remediation-plan.md),
which holds the analysis. This file is the running order: **do one step, confirm its check, then
move on.** Steps are ordered so nothing later depends on something earlier being skipped.

Host: the production VPS (name kept in the private runbook), stack dir
`/opt/supersync/app_code/packages/super-sync-server`.

---

## DONE

- [x] **Raise the Postgres cache ceiling.** `docker update --memory 2048m --memory-swap 4096m
supersync-postgres`. Confirmed: `1.013GiB / 2GiB`. Persisted to `docker-compose.yml` in the
      repo so a deploy keeps it.
- [x] **uptime-kuma monitors.** Internal + public `/health`, 60 s, 1 retry, resend every 10 checks,
      cert-expiry on the public one. Both Up.
- [x] **ntfy push channel** created and applied to both monitors, alongside the pre-existing email
      channel.

---

## STEP 1 — Arm the push channel (5 min) — DONE

Until someone subscribes, the ntfy channel sends into the void and email is still the only live path.

1. Install the ntfy app (iOS / Android / web at ntfy.sh).
2. Subscribe to the topic recorded in the private runbook. **Do not paste it into this
   file or any other tracked file** — on ntfy.sh the topic name IS the access control:
   anyone holding it can read every alert and publish convincing fake ones, including a
   false "recovered".
3. In Kuma → Settings → Notifications → "SuperSync Push (ntfy)" → **Test**.

**Check:** a test notification arrives on the phone.

---

## STEP 2 — Finish the `adm` group change (2 min) — DONE

`usermod -aG adm jo` has run, but `groups` still shows the old set because the change only applies
to a **new login session**. It is not done until this check passes.

```bash
# log out of ssh entirely, then log back in
groups                                       # must now include: adm
journalctl -k -n 1 --no-pager                # must print a line, not a permission error
```

**Check:** `groups` lists `adm` AND `journalctl -k` returns output.

**Why this mattered:** the first draft of the `health-alert.sh` fix reported "OOM check unavailable"
into `PROBLEMS`, which would have kept `PROBLEMS` permanently non-empty while `jo` lacked `adm`.
That does **not** suppress later alerts — the dedupe key is a content hash, so a new problem changes
the hash and still mails — but it does kill the recovery branch (`[ -n "$PROBLEMS" ]`), so
`Health Check Recovered` could never fire again. The `/simplify` review caught it; the condition now
goes to a marker `deploy.sh` surfaces, so this no longer gates anything. Doing the group change is
still correct — without it OOM detection is simply blind.

---

## STEP 3 — Separate the backup from the reboot (2 min) — DONE (now `0 1 * * *`)

They currently collide at 03:00 (see plan §1 RC1). The dump takes **~65-80 minutes**, so it is
still running deep into the reboot window.

```bash
crontab -e
# change the backup line from  0 3 * * *  to  0 1 * * *
```

**Check:** `crontab -l` shows `0 1 * * *` for `backup.sh`, and `Automatic-Reboot-Time "03:00"` is
unchanged. The dump now finishes ~02:20, well clear of 03:00.

---

## STEP 4 — Confirm backups are actually healthy — DEFERRED to the maintenance window

There is **no `supersync_20260825_*.sql.gz`** — the reboot killed that night's dump. 08-20 through
08-24 all exist at ~4.6 GB. Verify one of them is genuinely restorable rather than merely present.

```bash
cd /opt/supersync/app_code/packages/super-sync-server/backups
gzip -t supersync_20260824_030001.sql.gz && echo "stream intact"
zcat supersync_20260824_030001.sql.gz | tail -3
# must end with:  -- PostgreSQL database dump complete
```

**Check:** both pass on 08-24. If the trailer is missing, stop and raise it — that would mean the
nightly dumps have been silently truncating and this is a bigger problem than the outage.

Tonight's run (after STEP 3) should produce a fresh `20260826_010001` file. Confirm tomorrow.

---

## Measured 2026-08-25 ~10:51Z — the I/O margin is thinner than assumed — PARTLY SUPERSEDED

> Points 2 and 3 below were extrapolated from a cold random-access measurement and are too
> pessimistic. See "Calibration correction" at the end of STEP 6 for what still holds.

Running `gzip -t` on one 4.6 GB backup (a plain sequential read, nothing exotic) during normal
daytime traffic was enough to:

- make the site noticeably slow, and
- blow the health-alert DB probe's inner `timeout 18` (`health-alert.sh:345`), producing
  `Database monitoring checks failed (exit 143)` — 143 = 128 + SIGTERM.

Postgres recovered immediately once the read was killed (3.17% CPU, 6 active of 37 connections).

**Implications for the steps below — treat these as measured, not cautious:**

1. The `vacuum_cost_delay` throttle in STEP 6 is not optional politeness. Run it and watch.
2. STEP 7's dry run does a full 861k-page scan — heavier than what just caused this. It is not a
   "run it whenever" task.
3. STEP 10's `CREATE INDEX CONCURRENTLY` is heavier again, reads the table twice, and sorts.
   It needs a real window, not a quiet-looking moment.
4. Backup verification (`gzip -t`) belongs in that same window, not in the middle of the day.

## STEP 5 — Boot safety net — DONE (unit installed, `active (exited)`, ExecStartPre+ExecStart both `status=0/SUCCESS`)

Independent of any code deploy; it only runs `docker compose up -d` against files already on the
host.

```bash
# confirm first that this is how the stack is actually started
grep -r COMPOSE_FILE .env 2>/dev/null; echo "---"; ls docker-compose*.yml
```

Then install `/etc/systemd/system/supersync-boot.service`:

```ini
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

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now supersync-boot.service
sudo systemctl status supersync-boot.service        # must be: active (exited), no errors
```

**Check:** status is clean and all five containers still `running`.

**Do NOT reboot to test yet** — do that at STEP 9, once Kuma is armed so the reboot also validates
alerting.

---

## STEP 6 — VACUUM — DONE 2026-08-25 (99.0% coverage)

Prerequisite for the index migration: index-only scans need visibility-map coverage, which was
82.8%.

`VACUUM` (not `VACUUM FULL`) takes only `SHARE UPDATE EXCLUSIVE` — **it blocks no reads and no
writes.** The only cost is I/O, and `vacuum_cost_delay` throttles that.

```bash
docker compose exec -T postgres psql -U supersync -d supersync </dev/null \
  -c "SET statement_timeout = 0;" \
  -c "SET vacuum_cost_delay = 20;" \
  -c "SET max_parallel_maintenance_workers = 0;" \
  -c "VACUUM (ANALYZE, VERBOSE) operations;"
```

Two deliberate changes from the first attempt, which failed with
`could not resize shared memory segment ... No space left on device`:

- **`maintenance_work_mem` is NOT raised.** Setting it to 256MB made parallel vacuum request a
  256 MB shared-memory segment against a container `shm_size` of exactly 256m. That was the error.
- **`max_parallel_maintenance_workers = 0`** removes the shared-memory request entirely. Single-
  threaded is slower but gentler, which is what we want mid-traffic anyway.

**Result: `relallvisible/relpages` = 858355/867117 = 99.0%.** Target met.

Run in two passes — the first was interrupted at 87% by Ctrl-C, the second scanned only the
remaining **45,891 pages (5.29%)** and finished in **83 s**. That is worth remembering: VACUUM
WAL-logs visibility-map bits page by page, so **an interrupted VACUUM keeps all completed work**.
It is safe to cancel and resume across several short windows rather than holding one long one.

### Three findings from the VERBOSE output

1. **The table is not bloated.** `tuples: 4 removed, 8698403 remain`. Four dead rows in 8.7 M.
   The 6.7 GB heap is live data, so `VACUUM FULL` / `pg_repack` would reclaim ~nothing and must not
   be proposed as a size fix. The only lever on table size is a working retention sweep — which is
   exactly what STEP 7 and STEP 10 restore. This _raises_ their value.
2. **No wraparound risk.** `age(relfrozenxid)` = 7,016,317 against a 200 M `autovacuum_freeze_max_age`
   default — 3.5%. Since the vacuum reported the current XID counter at ~7,019,642, this table has
   burned ~7 M XIDs in its entire lifetime. The feared unavoidable full-table anti-wraparound scan is
   many years away. Closed, not parked.
3. **`index scans: 0` — index cleanup was skipped, not fast.** `index scan bypassed: 7490 pages
(0.86% of total) have 13661 dead item identifiers`; Postgres skips the index pass under its
   2%-of-pages threshold. Those dead item IDs remain. Harmless at this ratio, but it means this run
   is **no evidence at all** about how expensive index I/O is on this host — and STEP 10 is pure
   index I/O.

### Calibration correction (supersedes the section above)

The earlier "I/O margin is thinner than assumed" note was extrapolated from a single number:
24 ms per 8 KB block, measured on a **cold, random-access** `EXPLAIN`. Applying it to sequential
work was wrong and made every estimate alarmist. Sequential throughput here is fine
(2741 blk/s ≈ 22 MB/s on the scanned portion).

What survives the correction, and what does not:

- **Does not survive:** "STEP 7's dry run is heavier than what caused the 10:51 incident." It is a
  sequential aggregate scan. Expect minutes.
- **Survives:** the 10:51 incident itself. 4.6 GB of genuinely uncacheable sequential reads both
  competed for the disk _and_ evicted Postgres's page cache. That was contention, and it did blow
  an 18 s probe timeout. Backup verification still belongs in a quiet window.
- **Still unmeasured:** STEP 10. `CREATE INDEX CONCURRENTLY` reads the table twice and sorts, and
  finding 3 means we have no local measurement of index-write I/O. Do not assume it is cheap
  because the vacuum was.

---

## STEP 7 — Dry-run the old-ops sweep — FAILED 2026-08-25, being rescoped

First attempt died at the 30-minute `statement_timeout` in phase 1
(`computing per-user prune boundaries…`). The override was confirmed live — `SHOW statement_timeout`
through the monitoring connection returned `30min` — so this was a genuine 30 minutes of work, not a
misapplied setting.

**Why it will not be fixed by STEP 10.** The gate and production run different queries:

|                                                   | query                                                                      | indexable                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| production sweep (`storage-quota.service.ts:475`) | `groupBy userId WHERE serverSeq>1 AND causal-full-state`, `_max serverSeq` | **yes** — selective; this is what P1-A targets |
| dry-run gate (`old-ops-sweep-plan.ts:89`)         | `FROM operations o GROUP BY o.user_id`, **no WHERE**                       | **no** — must aggregate all 8.7 M rows         |

The gate deliberately reports on _every_ user holding operations, including the unreachable residual
cohort, so it cannot use the causal partial index. No index makes it fast. Raising the timeout again
only buys a longer I/O storm for an answer that does not test P1-A's premise.

**Superseded assumption:** the plan's claim that the dry run must precede the index is still right on
_safety_ grounds (it sizes the delete blast radius), but the note that it would be "5-20 min" and the
later "expect minutes" were both wrong — extrapolated from sequential-scan behaviour onto a query
that is not sequential-bound.

### Replacement measurements (short, paste-safe, bounded)

Run these instead. They test the actual premise of STEP 10:

```bash
# 1. THE production sweep query. Does it need the new index at all?
docker compose exec -T postgres psql -U supersync -d supersync </dev/null -c "SET statement_timeout='300s';" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT user_id, max(server_seq) FROM operations WHERE server_seq > 1 AND (op_type IN ('SYNC_IMPORT','BACKUP_IMPORT') OR (op_type='REPAIR' AND repair_base_server_seq IS NOT NULL)) GROUP BY user_id;"
```

```bash
# 2. The bare full aggregate — explains the gate's 30 minutes.
docker compose exec -T postgres psql -U supersync -d supersync </dev/null -c "SET statement_timeout='600s';" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT user_id, count(*) FROM operations GROUP BY user_id;"
```

```bash
# 3. Blast radius, without the gate's residual-cohort reporting.
docker compose exec -T postgres psql -U supersync -d supersync </dev/null -c "SET statement_timeout='300s';" -c "SELECT count(*) AS users_with_boundary FROM (SELECT user_id FROM operations WHERE server_seq > 1 AND (op_type IN ('SYNC_IMPORT','BACKUP_IMPORT') OR (op_type='REPAIR' AND repair_base_server_seq IS NOT NULL)) GROUP BY user_id) t;"
```

**Still a hard gate.** STEP 10 arms a delete path capped at 25,000 rows/run that has not completed in
an unknown number of days. Measurement 3 is the minimum substitute for the gate's blast-radius
number; do not skip it.

**Paste hygiene:** the terminal dropped characters from an earlier long multi-line SQL paste
(`s.snapNULL AS has_snapshJOIN`), producing a bogus syntax error. Keep each `-c` on a single line.

---

## STEP 8 — Deploy the repo changes

Uncommitted on branch `feat/supersync-health-check-failed-at-31fd3d`:

| file                                | change                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `scripts/health-alert.sh`           | HTTP-code regex, `ps -a` + `{{.ExitCode}}`, old-compose fallback, OOM probe out of the Docker gate, blind-check marker |
| `tests/health-alert-script.spec.ts` | 68 tests (from 51)                                                                                                     |
| `scripts/deploy.sh`                 | surfaces the `oom-check-blind` marker                                                                                  |
| `scripts/MONITORING-README.md`      | check table + "OOM check unavailable" troubleshooting entry                                                            |
| `docker-compose.yml`                | postgres `mem_limit` and `effective_cache_size` behind env vars, defaults 2048m / 1536MB                               |
| `env.example`                       | documents the two new tunables                                                                                         |
| `docs/2026-08-25-*.md`              | this file + the plan                                                                                                   |

**Blocked on STEP 2.** Do not deploy until `groups` lists `adm`.

### The memory raise is opt-in — deploying does NOT restart the database

`mem_limit` and `effective_cache_size` are behind `POSTGRES_MEM_LIMIT` /
`POSTGRES_EFFECTIVE_CACHE_SIZE`, and the **defaults are the released values** (1536m / 1GB).
Verified by config hash — deploying this commit with no `.env` change resolves to
`130e6cbd…`, byte-identical to the pre-commit config, so `docker compose up -d` does **not**
recreate postgres:

| `.env`                               | postgres config hash | recreate? |
| ------------------------------------ | -------------------- | --------- |
| pre-commit (hardcoded 1536m + 1GB)   | `130e6cbd…`          | baseline  |
| **unset (new defaults 1536m + 1GB)** | **`130e6cbd…`**      | **no**    |
| `POSTGRES_MEM_LIMIT=2048m` only      | `a076fc59…`          | yes       |
| both raised (2048m + 1536MB)         | `b5eb4282…`          | yes       |

Note both knobs feed the same hash: raising only one still recreates.

**When you do raise them, it restarts postgres cold.** `deploy.sh:279`
(`up -d --wait "$POSTGRES_SERVICE"`) runs before migrations, so the page cache on the 6.7 GB
heap is dropped — root cause 3 in the plan: the cleanup `groupBy` needs ~89 s cold
(3,711 blocks × 24 ms) against a 60 s `statement_timeout`, vs 155 ms warm.

**So raise them after STEP 10 lands.** The partial index is what makes that query affordable
on a cold cache, which turns the restart from a risk into a non-event — and spends exactly one
restart to pick up both the bigger cap and the corrected planner hint.

Until then the live container keeps the 2048m from STEP 1's `docker update`, but note
`effective_cache_size` is a **startup** parameter, so the running postgres is still planning
against `1GB`. The raise is half-inert until that restart.

**Check after deploy:** `docker stats --no-stream supersync-postgres` still shows a 2GiB limit (the
recreate should pick it up from compose), and a manual `scripts/health-alert.sh` run reports no
problems.

---

## STEP 9 — Reboot test (5 min)

Only after STEPs 1, 5 and 8. This validates the boot unit _and_ the alerting path in one shot.

```bash
sudo systemctl reboot
```

**Check:** all five containers come back with no manual action, `/health` returns 200 within ~3
minutes, and you receive a down-then-up notification on your phone.

---

## STEP 10 — Index migration (LAST, gated on STEP 7)

Full detail and the SQL in the plan, §2 P1-A. Two things that will bite otherwise:

- Raise `MIGRATION_TIMEOUT` well past its 900s default, or the build dies at an effective 865s
  ceiling and leaves an INVALID index.
- **Do not start it while the nightly `pg_dump` is running.** `CREATE INDEX CONCURRENTLY` waits for
  every transaction older than itself, and that dump holds one open for 65-80 minutes.

---

## Parked — revisit later, not now

- **Host RAM 4 GB → 8 GB.** Only worth it if STEPs 6-10 don't settle the pool-busy alerts. The
  `mem_limit` raise was the free half; this is the half that costs money.
- **Traffic histogram.** `docker logs supersync-caddy --since 168h -t | awk '{print substr($1,12,2)}' | sort | uniq -c`
  returned only hour 09 — the container was recreated at 09:02 UTC and lost its history. Re-run in
  a few days to find the real quiet hour, which also tells you where the reboot time belongs.
- **`random_page_cost=1.1`** claims random I/O costs about the same as sequential. True on SSD,
  false at 24 ms/block. May be steering the planner wrong across the whole workload. Needs its own
  measurement — do not change it casually.
- **Caddy is at 88% of its `mem_limit`** (225.2MiB / 256MiB, measured 2026-08-25). Not urgent, but
  it has less headroom than anything else in the stack and an OOM there is a full outage. Watch it;
  raise to 384m if it climbs.
- **Add verification to `backup.sh`** (`gzip -t` + assert the dump trailer). An unverified backup is
  one you find out about during a restore.
- **65-80 minute nightly `pg_dump`.** Long-running transaction + sustained I/O every night. Consider
  `--format=custom --compress=0` piped to a faster compressor, or a replica to dump from. Out of
  scope for this incident but it touches vacuum, CIC, and disk load.
