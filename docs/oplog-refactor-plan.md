# Operation Log Refactoring Plan

## Overview

This document outlines the refactoring work needed for the operation log system. The goal is to improve code quality, reduce complexity, and make the codebase more maintainable.

## Phase 1: Split OperationLogSyncService (642 lines)

The `operation-log-sync.service.ts` is too large and handles multiple responsibilities. Split into focused services:

### 1.1 Create `OperationLogManifestService`

**File:** `src/app/core/persistence/operation-log/operation-log-manifest.service.ts`

**Responsibilities:**

- `_loadRemoteManifest()` - Load manifest from remote
- `_uploadRemoteManifest()` - Upload manifest to remote
- Manifest version handling
- File path generation (`_getManifestFileName()`)

**Methods to extract from sync service:**

- Lines 74-94: `_loadRemoteManifest()`
- Lines 96-105: `_uploadRemoteManifest()`
- Lines 74: `_getManifestFileName()`

### 1.2 Create `OperationLogUploadService`

**File:** `src/app/core/persistence/operation-log/operation-log-upload.service.ts`

**Responsibilities:**

- Upload pending local operations to remote
- Chunk operations for upload
- Mark operations as synced after successful upload
- Handle API vs file-based upload

**Methods to extract:**

- Lines 107-200: `uploadPendingOps()` and related private methods
- Lines ~150-180: `_uploadViaApi()` logic
- Lines ~180-200: `_uploadViaFiles()` logic

### 1.3 Create `OperationLogDownloadService`

**File:** `src/app/core/persistence/operation-log/operation-log-download.service.ts`

**Responsibilities:**

- Download remote operations
- Parse and validate downloaded operations
- Filter already-applied operations
- Handle API vs file-based download

**Methods to extract:**

- Lines 200-420: `_downloadRemoteOpsViaApi()` and `_downloadRemoteOpsViaFiles()`
- Lines ~350-400: Remote op file parsing logic

### 1.4 Keep in `OperationLogSyncService`

**Remaining responsibilities:**

- High-level sync orchestration (`sync()` method)
- Conflict detection (`detectConflicts()`)
- Coordination between upload/download services

## Phase 2: Extract Vector Clock Utilities

The `getCurrentVectorClock()` method in `operation-log-store.service.ts` has 40+ lines of comments expressing uncertainty. Extract and clarify.

### 2.1 Create `VectorClockService`

**File:** `src/app/core/persistence/operation-log/vector-clock.service.ts`

**Responsibilities:**

- `getCurrentVectorClock()` - Get merged clock from snapshot + ops
- `getEntityFrontier()` - Get per-entity vector clocks
- Document the vector clock semantics clearly

**Why:**

- The current implementation has extensive comments showing design uncertainty
- Centralizing VC logic makes it easier to reason about and test
- Can add comprehensive JSDoc explaining the semantics

### 2.2 Update Documentation

Add clear JSDoc comments explaining:

- What vector clocks represent in this system
- When to use global VC vs entity frontier
- How compaction affects VC precision

## Phase 3: Remove Dead/Duplicate Code

### 3.1 Remove `markApplied()` No-op

**File:** `operation-log-store.service.ts:145-147`

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async markApplied(_id: string): Promise<void> {
  // No-op: appliedAt is set by append()
}
```

**Action:** Remove this method entirely. It's documented as a no-op "for interface completeness" but adds confusion.

### 3.2 Clean Up Stress Tests

**File:** `operation-log-stress.spec.ts`

The stress tests are currently skipped due to timing issues. Options:

1. Move to a separate "benchmark" directory
2. Add proper isolation with unique DB names per test
3. Document how to run them manually for performance testing

## Phase 4: Fix Type Safety Issues

### 4.1 Replace `as any` Casts

**Files affected:**

- `operation-log-sync.service.ts:637` - `loadAllData({ appDataComplete: result.repairedState as any })`
- `operation-log-hydrator.service.ts:109, 122, 178` - Various `as any` casts
- `dependency-resolver.service.ts:24` - `const payload = op.payload as any`

**Action:** Create proper type definitions or type guards instead of casting.

### 4.2 Add Discriminated Union for Operation Payloads

Currently `payload: unknown` loses type information. Consider:

```typescript
type OperationPayload =
  | { type: 'task'; task: TaskPayload }
  | { type: 'project'; project: ProjectPayload }
  | { type: 'batch'; tasks: TaskPayload[] };
// etc.
```

## Phase 5: Performance Optimizations (Lower Priority)

### 5.1 Add Index for `getUnsynced()`

**File:** `operation-log-store.service.ts:106-111`

Current implementation does a full table scan:

```typescript
const all = await this.db.getAll('ops');
return all.filter((e) => !e.syncedAt && !e.rejectedAt);
```

**Action:** Add a compound index on `(syncedAt, rejectedAt)` or a `source` index to enable efficient queries.

### 5.2 Consider Batch Operations

Methods like `markSynced()` and `markRejected()` update records one at a time in a transaction. Could be optimized with cursor-based batch updates.

## Implementation Order

1. **Phase 3.1** - Remove `markApplied()` (trivial, low risk)
2. **Phase 1.1-1.4** - Split sync service (significant, needs careful testing)
3. **Phase 2** - Extract vector clock utilities
4. **Phase 4.1** - Fix `as any` casts
5. **Phase 3.2** - Clean up stress tests
6. **Phase 5** - Performance optimizations (if needed)

## Testing Strategy

After each refactoring step:

1. Run existing tests: `npm run test:file 'src/app/core/persistence/operation-log/*.spec.ts'`
2. Run full test suite: `npm test`
3. Build: `ng build --configuration=development`
4. Manual sync test if sync-related changes

## Remaining Unit Tests (After Refactor)

After refactoring, add tests for:

- `operation-log-sync.service.spec.ts` (will be simpler after split)
- `operation-log-upload.service.spec.ts` (new)
- `operation-log-download.service.spec.ts` (new)
- `operation-log-manifest.service.spec.ts` (new)
- `operation-log.effects.spec.ts`
- `operation-log-hydrator.service.spec.ts`
- `conflict-resolution.service.spec.ts`
- `operation-applier.service.spec.ts`
- `validate-state.service.spec.ts`
- `repair-operation.service.spec.ts`

## Files Summary

**To Create:**

- `operation-log-manifest.service.ts`
- `operation-log-upload.service.ts`
- `operation-log-download.service.ts`
- `vector-clock.service.ts` (optional, could stay as utility)

**To Modify:**

- `operation-log-sync.service.ts` - Remove extracted code, delegate to new services
- `operation-log-store.service.ts` - Remove `markApplied()`, possibly extract VC logic
- `operation-log-hydrator.service.ts` - Fix type casts
- `dependency-resolver.service.ts` - Fix type casts

**To Delete/Move:**

- Nothing to delete, stress tests could be moved to benchmarks folder
