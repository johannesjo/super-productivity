# High Volume Sync Investigation

## Summary

Investigation into sync failures when synchronizing 100+ operations between clients.

**STATUS: RESOLVED** - Root cause identified and fixed on 2025-12-22.

## Problem Description

When Client A creates many tasks (50+) and marks most as done, then syncs to Client B:

- All tasks appear on Client B
- But only a subset of "done" states are applied (16 out of 49 expected)

## Root Cause

**Server Piggyback Limit**: The server's upload endpoint limits piggybacked operations to 100, but returns `latestSeq` as the actual server sequence (e.g., 199). The client then updates its `lastServerSeq` to 199, thinking it has all ops. When it subsequently downloads, it gets 0 ops because there are none after seq 199.

## Fix Applied

### 1. Server-side: Added `hasMorePiggyback` flag

**File**: `packages/super-sync-server/src/sync/sync.routes.ts`

When the piggyback limit (100) is reached and more ops exist on the server:

- Server returns `hasMorePiggyback: true` in the response
- Logs: `Piggybacking N ops (has more: true, lastPiggybackSeq=X, latestSeq=Y)`

### 2. Client-side: Handle `hasMorePiggyback`

**Files**:

- `src/app/pfapi/api/sync/sync-provider.interface.ts` - Added `hasMorePiggyback` to `OpUploadResponse`
- `src/app/core/persistence/operation-log/sync/operation-log-upload.service.ts`:
  - When `hasMorePiggyback` is true, set `lastServerSeq` to max piggybacked op's serverSeq instead of `latestSeq`
  - The subsequent download will then fetch the remaining ops

### Earlier Fix: `switchMap` → `mergeMap` (still needed)

**File**: `src/app/features/tasks/store/task-related-model.effects.ts`

Changed `switchMap` to `mergeMap` in `autoAddTodayTagOnMarkAsDone` effect to ensure ALL mark-as-done actions trigger `planTasksForToday`, not just the last one.

## Test Results

After fix:

```
[Client B] Received 100 piggybacked ops (more available on server)
[Client B] hasMorePiggyback=true, setting lastServerSeq to 100 instead of 199
[Client B] Downloaded ops breakdown: {UPD: 99}
[Client B] Applied and marked 99 remote ops
[HighVolume] DOM shows 49 done tasks
1 passed
```

All 49 done states now sync correctly!

## Files Modified

1. `packages/super-sync-server/src/sync/sync.types.ts` - Added `hasMorePiggyback` to `UploadOpsResponse`
2. `packages/super-sync-server/src/sync/sync.routes.ts` - Detect and return `hasMorePiggyback` flag
3. `src/app/pfapi/api/sync/sync-provider.interface.ts` - Added `hasMorePiggyback` to client-side type
4. `src/app/core/persistence/operation-log/sync/operation-log-upload.service.ts` - Handle `hasMorePiggyback`
5. `src/app/features/tasks/store/task-related-model.effects.ts` - switchMap → mergeMap fix

## Running the Tests

```bash
# Run stress tests
npm run e2e:supersync:file tests/sync/supersync-stress.spec.ts

# Run with verbose logging
E2E_VERBOSE=1 npm run e2e:supersync:file tests/sync/supersync-stress.spec.ts

# Run only high volume test
npm run e2e:supersync:file tests/sync/supersync-stress.spec.ts --grep "High volume"
```
