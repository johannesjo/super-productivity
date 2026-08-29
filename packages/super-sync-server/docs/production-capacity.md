# Production Capacity and the OpenVZ Constraint

**Status:** current. **Numbers last verified:** 2026-08-28. Every figure below is
a point-in-time measurement — re-measure before relying on any of them.

## Scope

This documents the **measured limits of the hosted SuperSync deployment** and the
design decisions those limits have already forced, so that neither has to be
rediscovered from commit messages and closed issues.

Host names, unix accounts, filesystem paths, and the backup/reboot schedule are
deliberately **not** here — they live in the operator's private runbook, which is
also where the 2026-08-25 outage remediation plan went when it was removed from
this repository. What follows is the part that is safe to keep in the open and
that contributors need in order to read the code correctly.

## The constraint

| Property                       | Value                                      | Source                         |
| ------------------------------ | ------------------------------------------ | ------------------------------ |
| Virtualization                 | OpenVZ / Virtuozzo container               | `systemd-detect-virt` → openvz |
| Disk throughput limit          | 50 MB/s                                    | Hoster, 2026-08-28             |
| Disk IOPS limit                | **150**                                    | Hoster, 2026-08-28             |
| Underlying media               | SSD                                        | Hoster, 2026-08-28             |
| Host RAM                       | 4 GB                                       | Measured 2026-08-25            |
| Postgres container `mem_limit` | 1,536 MB                                   | `docker-compose.yml`           |
| Cold random read latency       | **~9.5 ms per 8 KB block**                 | Measured 2026-08               |
| Sequential throughput          | ~22 MB/s (fine — the cap is on random I/O) | Measured 2026-08-25            |

The IOPS limit is **tariff-bound, not a fault**. The hoster confirmed on
2026-08-28 that the measured values match the configured limits, that the node is
SSD-backed, and — importantly — that **migrating the container to another node
leaves the limits unchanged**. There is no support ticket that fixes this.

### Why 150 IOPS is the binding constraint

150 IOPS × 8 KB = **1.2 MB/s of random reads**. Sequential access merges and is
unaffected, so the ceiling only bites where the workload seeks:

- The `operations` heap was 6,770 MB / 860,996 pages at 8.6M live rows (2026-08).
- A **random** page walk over all of it costs ~860,996 ÷ 150 ≈ **96 minutes**.
  Note this figure applies _only_ to seek-bound access. A sequential pass over
  the same heap plus its 1,911 MB TOAST relation is ~6.6 minutes at the measured
  ~22 MB/s, so never quote the 96 minutes for anything that scans in order — the
  nightly `pg_dump`'s runtime is **not** explained by it, and the likeliest
  cause there is per-row TOAST detoast fetches, which are random.
- Under cgroup v2 the page cache is charged to the container, so Postgres reaches
  at most `mem_limit` of `shared_buffers` + file cache: roughly **1.1 GB of
  cache**, no matter how much RAM the host has. That is ~16% of the 6.77 GB heap
  alone, but the same cache also has to hold ~3 GB of indexes and the 1.9 GB
  TOAST relation, so the real resident fraction of the working set is nearer
  **9–12%**.

The consequence is that anything touching the ~90% that is not resident pays
~9.5 ms per block. One measured example: the retention cleanup's fleet-wide
aggregate ran in **80,612 ms cold vs 155 ms warm** on identical block counts — a
520× difference that is entirely page cache versus disk.

## What this has already cost

Three independent costs trace back to the same hosting choice.

**1. No encryption at rest.** Both project-managed LUKS and PostgreSQL TDE were
implemented and then retired as incompatible with the OpenVZ environment. See
[`../archive/encryption-attempts-openvz-incompatible/`](../archive/encryption-attempts-openvz-incompatible/)
and [`encryption-at-rest.md`](encryption-at-rest.md).

**2. Undiagnosable database crashes.** A Postgres backend has been exiting with
code 2 — the `quickdie` / `SIGQUIT` path — roughly every two weeks for months
(~45 occurrences, #9695). Note this does **not** by itself mean an external
sender: when any one backend dies unexpectedly, the postmaster itself `SIGQUIT`s
every sibling connection and re-runs WAL recovery (`scripts/health-alert.sh`),
so exit code 2 is the ordinary consequence for the siblings. What the platform
prevents is identifying the sender for the _first_ victim: `auditd` cannot run in
an OpenVZ guest, and guest processes are ordinary host-visible PIDs. The cause is
therefore unattributable from inside the container — that is the finding, not
that any particular party is responsible.

**3. A permanent tax on query design.** Every mitigation in the next section
exists only because random reads cost ~9.5 ms here. That is recurring
engineering time, spent on work that a faster disk would make unnecessary.

## What has been built around it

These are responses to the constraint above, not general-purpose optimizations.
Each one's reasoning lives at its own call site — **pointers, not summaries**, so
this list cannot drift out of sync with the code it describes:

| Mitigation                                                                                           | Where the reasoning lives                                            |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Windowed retention deletes (stated two-sided `server_seq` range, not a discovered `take`)            | `storage-quota.service.ts`, #9692, #9763                             |
| Covering `(user_id, received_at, server_seq)` index for the fresh-prefix probe                       | migration `20260828000001`                                           |
| Causal partial index so the fleet-wide boundary scan runs index-only (additive; the broad one stays) | migration `20260829000000`                                           |
| Autovacuum **insert** scale factor at 0.02 (and why the other two are deliberately excluded)         | migration `20260828000003`                                           |
| `POSTGRES_MEM_LIMIT` / `POSTGRES_EFFECTIVE_CACHE_SIZE` kept opt-in                                   | `docker-compose.yml`, `env.example`                                  |
| Opt-in 60s `statement_timeout` — **off by default**, and only the `DATABASE_URL` form works          | `env.example`, `docker-compose.yml`                                  |
| Query-plan integration specs against real PostgreSQL                                                 | `tests/integration/old-ops-*-plan.integration.spec.ts`, #9191, #9192 |

### Operating the autovacuum tuning

`20260828000003` is checksum-frozen once applied, so its evolving guidance lives
here instead:

- **Before deploying it**, check `age(relfrozenxid)` on `operations` and its
  TOAST relation. An ordinary autovacuum yields to the `ALTER` after
  `deadlock_timeout`; an anti-wraparound one does not, and colliding with one
  _can_ fail the deploy with `57014`. `migrate-deploy.sh` does not auto-recover
  that shape — clear it with `prisma migrate resolve --rolled-back` and re-run.
- **The "~5× or ~0.5× vacuum I/O" question is answered, and it is why only the
  insert factor ships.** Measured with `VACUUM (VERBOSE)` on PostgreSQL 16
  against this schema: an insert-triggered pass reports `index scans: 0` and
  "index scan not needed", touching 16.9% of heap pages — the index pass is
  skipped outright, not merely LP_DEAD-bypassed. A pass following a `DELETE`
  reports `index scans: 1` and walks all 8 indexes (~3 GB). The amplification
  belongs to the **dead-tuple** factor, which is therefore left at its default;
  on a growing append-only table it is a no-op anyway, since the insert trigger
  always fires first. Re-measure if the table stops growing.
- **Do not justify it with the fresh-prefix probe.** That query is immune to
  visibility-map decay: `server_seq` is the covering index's third column, so it
  becomes an Index Cond and btree discards non-matching rows before the
  visibility check ever runs. Measured on PostgreSQL 16 against this schema —
  2,000 unvacuumed rows, a 38-page map deficit, `Heap Fetches: 0`. The cost
  lands on index-only scans that **emit** rows over the same window: the same
  fixture measured ~2,014 heap fetches, 0 after a VACUUM. Both are pinned in
  `tests/integration/old-ops-probe-plan.integration.spec.ts`. Note an audit of
  `src/` found no production query that is both index-only-capable and emits
  volume, so the benefit here is bounded map sag and freeze debt — not a
  measured query win.
- **Revisit against the monitoring report.** `npm run monitor stats` prints an
  `operations: visibility map & autovacuum` section — map coverage,
  `n_ins_since_vacuum`, `n_mod_since_analyze`, autovacuum cadence, the live
  `reloptions`, and `age(relfrozenxid)` — and warns below 90% coverage.
  `n_dead_tup` is shown but is not evidence on its own; it oscillates.
- **During a retention backlog dig-out** (raising
  `OLD_OPS_CLEANUP_MAX_DELETED_PER_RUN`, see `MONITORING-README.md`) deletes
  start triggering vacuums, so passes begin walking all 8 indexes. Whether that
  gets _worse_ per pass depends on which outruns which: a higher delete budget
  raises dead tuples per pass, a shorter interval lowers them. Do not assume;
  watch `n_dead_tup` and the autovacuum cadence in the monitoring report.

## The open decision

Whether to move the deployment off this platform is tracked in **#9780**, along
with the arguments either way and the outstanding question to the hoster. It is
deliberately not restated here: it is an unresolved operator decision, not
contributor documentation, and a second copy would go stale the moment the
hoster replies.

## Guidance for contributors

- Assume **random reads are expensive and sequential reads are not.** A plan that
  looks acceptable on a laptop NVMe can be an outage here.
- Prefer index-only scans, and treat anything that depends on the visibility map
  as depending on autovacuum actually running.
- Do not size a query by rows returned; size it by **blocks touched**, and prefer
  stated ranges over discovered limits.
- Numbers in this file are dated. Re-measure before relying on them, and see
  `scripts/MONITORING-README.md` for the tooling.
