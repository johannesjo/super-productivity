# Operation Log: Remaining Tasks & Future Enhancements

**Status:** Core Implementation Complete (Parts A, B, C, D)
**Branch:** `feat/operation-logs`
**Last Updated:** December 3, 2025

---

## Overview

The core Operation Log architecture (Local Persistence, Legacy Bridge, Server Sync, Validation & Repair) is fully implemented and operational. This document tracks future enhancements and optimizations.

---

## 1. Performance & Storage Optimizations

| Enhancement                  | Description                                                               | Priority | Effort |
| ---------------------------- | ------------------------------------------------------------------------- | -------- | ------ |
| **IndexedDB index**          | Add index on `syncedAt` for O(1) `getUnsynced()` queries                  | Low      | Low    |
| **Persistent compaction**    | Track `opsSinceCompaction` counter in DB to persist across restarts       | Low      | Low    |
| **Optimize getAppliedOpIds** | Consider Merkle trees or Bloom filters if log grows very large (>10k ops) | Low      | Medium |
| **Diff-based storage**       | Store diffs (e.g., diff-match-patch) for large text fields (Notes)        | Defer    | High   |

## 2. Observability & Tooling

| Enhancement       | Description                                                                 | Priority | Effort |
| ----------------- | --------------------------------------------------------------------------- | -------- | ------ |
| **Op Log Viewer** | Hidden debug panel (in Settings → About) to view/inspect raw operation logs | Medium   | Medium |

**Implementation Idea:**

- Tab showing total ops, pending ops, last sync time, vector clock.
- List of recent operations (seq, id, type, timestamp) with JSON expansion.

## 3. Feature Enhancements

| Enhancement    | Description                                                             | Priority | Effort |
| -------------- | ----------------------------------------------------------------------- | -------- | ------ |
| **Auto-merge** | Automatically merge non-conflicting field changes on the same entity    | Low      | High   |
| **Undo/Redo**  | Leverage the operation log history to implement robust global Undo/Redo | Low      | High   |

## 4. Migration System Improvements

Refinements for the Schema Migration system (Part A.7).

| Enhancement                  | Description                                   | Priority | Effort |
| ---------------------------- | --------------------------------------------- | -------- | ------ |
| **Operation migration**      | Transform old ops to new schema during replay | Low      | High   |
| **Conflict-aware migration** | Special handling for version conflicts        | Medium   | High   |
| **Migration rollback**       | Undo migration if it fails partway            | Low      | Medium |
| **Progressive migration**    | Migrate in background over multiple sessions  | Low      | High   |

---

# References

- [Architecture](./operation-log-architecture.md) - Complete System Design
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy Sync System
