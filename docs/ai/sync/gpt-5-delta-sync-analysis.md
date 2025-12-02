# Delta Sync Stability Analysis

**Model:** gpt-5  
**Date:** January 7, 2026

## 1) Executive Summary

The current delta-sync effort (SuperSync) is brittle because it depends on reconstructing intent from state diffs and on volatile local metadata (shadow state + watermarks). When that metadata is missing or stale, the client either uploads overly large patches or falls back to full downloads, reintroducing conflicts and erasing the performance gains delta-sync was supposed to deliver. Compounding this, the actual code path (`src/app/pfapi/api/sync/providers/super-sync/super-sync.ts`) is currently just a thin WebDAV wrapper—none of the documented delta logic (shadow state, diffing, watermarks) is wired in—so the system effectively runs in snapshot mode while the delta-specific metadata lives only in docs and planning files.

## 2) Root-Cause Analysis

### A. Shadow-State Dependency

- **Where it originates:** Delta generation is defined as `current state – shadow state`, with the shadow cached in IndexedDB/in-memory per the SuperSync client notes.
- **Why it manifests:** Shadow state is easily lost (IDB eviction, encryption key mismatch, cache cleared, new device). When missing, the client interprets “no shadow” as “everything changed,” triggering full-entity uploads and bulky merges. That also invalidates per-model watermarks because the server’s view is newer than the recreated shadow.
- **Why hard to stabilize:** Any recovery path that rebuilds shadow state must download and re-diff the entire dataset, which is O(N) and occurs non-deterministically (after crashes, quota evictions), making bugs intermittent and hard to reproduce.

### B. Divergent Watermarks & Vector Clocks

- **Where it originates:** Delta requests rely on per-model `lastSync` values stored locally (see delta-sync docs), while authoritative revisions live remotely in `__meta__`. In the current code, vector clocks and rev maps are handled by `SyncService`/`MetaSyncService`, but the SuperSync provider stub never persists or reconciles per-model watermarks, leaving the delta pathway without durable cursors.
- **Why it manifests:** If local watermarks drift (app restart during sync, partial writes, or device clock skew when stamps are reused for logging), the client may ask the server for changes the server has already compacted or skip ranges entirely. That produces “empty change set but stale shadow” scenarios where the client trusts outdated state.
- **Why hard to stabilize:** Watermark drift is silent; failures surface later as conflicts or missing updates. Without durable, transactional coupling between shadow writes and watermark writes, crash-consistency is not guaranteed.

### C. Shallow LWW Merge Semantics

- **Where it originates:** Server applies `merged = { ...oldData, ...newData }` (per SuperSync README), so correctness depends on clients sending full values for every top-level property that changed.
- **Why it manifests:** The diff generator must understand every nested shape. When it misses a nested field (e.g., only the changed sub-object is sent), the server overwrites the old object with the partial payload, dropping untouched keys. Concurrent edits (rename vs. complete) collapse to “last writer wins” because intent is not preserved.
- **Why hard to stabilize:** As models evolve (rich notes, boards, plugins), maintaining exhaustive diff coverage is error-prone. One missed field or schema migration reintroduces data loss.

### D. CPU-Heavy Diffing on Large Datasets

- **Where it originates:** Delta calculation walks the entire entity set and compares against the shadow, often via deep JSON comparisons.
- **Why it manifests:** For thousands of tasks, diffing pegs the UI thread, causing frame drops and timeouts. If data changes mid-diff (e.g., timers updating tasks), the computed delta no longer matches the final state, leading to spurious conflicts or missed updates.
- **Why hard to stabilize:** Optimization requires partitioned or incremental diffing plus worker offloading. Without that, regressions surface only with large, real-world datasets that are hard to replicate in tests.

### E. Fallback Path Coupled to WebDAV Snapshots

- **Where it originates:** When delta preconditions fail (missing shadow, unknown model), the client reverts to full WebDAV snapshot sync.
- **Why it manifests:** Switching modes changes merge semantics (snapshot LWW vs. delta patches). After fallback, the shadow state no longer matches server revisions, so the next delta run computes wrong patches or rejects uploads due to revision mismatches.
- **Why hard to stabilize:** Two sync modes sharing the same metadata require careful invalidation. Today the mode switch is opportunistic rather than transactional, so it is easy to end up with hybrid state that neither path fully owns.

### F. Missing Pagination & Backpressure

- **Where it originates:** Delta endpoints and client loops assume manageable change sets; pagination/streaming is noted but not consistently enforced.
- **Why it manifests:** Large change bursts (first sync after weeks offline) exhaust memory on either side, causing retries that replay the same partial batch and multiply conflicts.
- **Why hard to stabilize:** Without end-to-end flow control, fixes must be applied simultaneously on client and server. Partial fixes (e.g., chunked uploads without chunked downloads) leave asymmetric failure modes.

## 3) Why Stabilization Remains Difficult

- **State-derived, not intent-derived:** The system attempts to infer intent from mutable snapshots, so any shadow corruption forces expensive recomputation and can silently lose semantics.
- **No single source of truth for progress:** Watermarks, vector clocks, and shadow blobs are stored separately, so crash recovery lacks atomicity.
- **High operational surface area:** The design spans WebDAV fallbacks, optional encryption, IndexedDB persistence, and REST deltas. Each layer introduces its own failure modes, and they compound. Because SuperSync currently subclasses `WebdavBaseProvider`, any future delta logic must coexist with legacy upload/download flows, increasing the chance of hybrid, partially migrated states.
- **Testing gaps for edge scales:** Most issues surface with large, real-world datasets and mid-sync interruptions, which are hard to simulate in unit tests without dedicated fixtures and soak tests.

## 4) Assumptions

- Analysis is based on the in-repo SuperSync docs/README and current client scaffolding; production deployments may have additional instrumentation not visible here.
- Where concrete telemetry is missing, impacts are inferred from the documented merge strategy (shallow LWW) and reliance on shadow state + local watermarks.
- The current tree shows no persisted shadow state or watermark handling in `SuperSyncProvider`; this absence is treated as a primary destabilizer alongside the conceptual issues.
