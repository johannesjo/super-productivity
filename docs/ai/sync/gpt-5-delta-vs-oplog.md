# Delta Sync vs. Operation Log

**Model:** gpt-5  
**Date:** January 7, 2026

## 1) Approaches Compared

- **Current Delta Sync (state diff):** Compute per-entity diffs against a cached shadow state, push merged JSON fragments to the server, fall back to WebDAV snapshots when preconditions fail. In the current codebase, `SuperSyncProvider` (`src/app/pfapi/api/sync/providers/super-sync/super-sync.ts`) is still a WebDAV wrapper with none of the diff/shadow/watermark logic wired, so the live behavior remains snapshot-style despite the delta design docs.
- **Operation Log (feat/operation-logs):** Persist NgRx actions as append-only operations with vector-clock metadata; sync exchanges ops, and local state is rebuilt by replay + periodic compaction.

## 2) Criteria-by-Criteria Assessment

| Criteria                           | Delta Sync (current)                                                                                                                                             | Operation Log (feat/operation-logs)                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sync speed**                     | Slow start when shadow state is missing; diffing is O(N) per model and blocks UI for large datasets; upload waits for diff completion.                           | Fast: ops are produced at action time; sync is O(number of pending ops); hydration uses snapshot + tail replay for quick startup.                              |
| **Disk usage**                     | Requires current state + shadow copy (~2×) plus temporary full snapshots after fallbacks; shadow duplication costs scale with dataset size.                      | Stores current state + op log; log grows but compaction can prune (snapshot + truncate). Early usage lighter; long-term cost depends on compaction discipline. |
| **Maintainability**                | High cognitive load: diff rules must mirror every schema change; shadow/watermark invalidation paths are fragile; two sync modes (delta/WebDAV) to keep aligned. | Medium: reducers already encode semantics; ops reuse action types; main risks are compaction correctness and migration tooling, but logic is centralized.      |
| **Conflict handling**              | Shallow LWW at property level; intent (rename vs. complete) is lost; concurrent nested edits can overwrite.                                                      | Semantic merge via op ordering + vector clocks; per-entity conflicts detectable; user-visible conflicts can be scoped to specific ops.                         |
| **Robustness with large datasets** | Weak: full diff on thousands of entities spikes CPU/memory; missing pagination leads to oversized change sets; shadow loss forces full re-syncs.                 | Stronger: op count scales with actual activity, not dataset size; replay cost is linear in pending ops; compaction keeps tail bounded if scheduled.            |
| **Expected long-term complexity**  | Increases non-linearly as models add nested structures; every new field needs diff/merge rules; fallback interactions multiply states to test.                   | More predictable: core primitives (append, replay, compact) stay stable; complexity is front-loaded in compaction and migration mechanisms.                    |

## 3) Overall Takeaways

- Delta sync delivers bandwidth savings only when shadow state is durable and schemas are simple; otherwise it regresses to full snapshots with higher failure risk.
- Operation logs align with the app’s action-driven architecture and make conflicts explicit, but require disciplined compaction and tooling to avoid unbounded growth.
- Migration cost to op logs is significant (genesis snapshot + reducer audit), yet it simplifies future features (undo, auditing, selective replay) that delta diffing cannot support reliably.

## 4) Effort Estimate & Minimal Implementation Plan (Per Approach)

- **Delta Sync (to make it real)**

  - **Estimate:** 3–5 engineering weeks with two engineers (client + server) to reach stable beta.
  - **Plan:** (1) Implement and persist shadow state + per-model watermarks in `SuperSyncProvider` (IndexedDB) with crash-safe coupling to upload/download transactions. (2) Add diff+merge pipeline and property-level patching that matches server shallow merge semantics, plus pagination/backpressure. (3) Integrate with `SyncService` rev maps/vector clocks, define explicit fallback invalidation rules, and add large-dataset perf tests. (4) Harden with soak tests for mid-sync crashes and IDB eviction.

- **Operation Logs (feat/operation-logs)**
  - **Estimate:** 4–6 engineering weeks with two engineers (NgRx + persistence), plus migration QA.
  - **Plan:** (1) Finish op capture layer (whitelist NgRx actions, stable op schema) and local append-only store with replay hydrator + periodic compaction. (2) Wire sync transport for ops (upload pending, fetch tail since vector clock) and server-side append with per-client cursors. (3) Build compaction/snapshotting and migrations (genesis snapshot; backfill from current state). (4) Add conflict surfacing UI for per-entity/ per-op conflicts and regression tests across devices.

## 5) Assumptions

- Operation-log behavior reflects the design in `docs/ai/operation-log-sync.md` and the `feat/operation-logs` branch plan; implementation details may evolve.
- Delta sync observations are based on current SuperSync docs and client scaffolding; if server/client pagination or transactional shadow persistence is added, some trade-offs may improve.
