# Vector Clock Test Fix Summary

## The Problem

The test "should initialize vector clock fields during download when missing" in `sync.service.spec.ts` was failing because it expected `UpdateLocal` but was getting `InSync`.

## Root Cause

The test was using the default `createDefaultLocalMeta` helper which sets:

- `localLamport: 5`
- `lastSyncedLamport: 5`

This caused the mixed vector clock state handling to use Lamport comparison instead of timestamp comparison. With Lamport values of 5 (no changes), the system correctly returned `InSync`.

## The Fix

Set Lamport values to 0 in the test data:

```typescript
const localMeta = createDefaultLocalMeta({
  lastUpdate: 1000,
  lastSyncedUpdate: 1000,
  localLamport: 0, // Set to 0 to ensure timestamp comparison is used
  lastSyncedLamport: 0,
  // No vector clock fields
});

const remoteMeta = createDefaultRemoteMeta({
  lastUpdate: 2000,
  localLamport: 0, // Ensure consistent Lamport values
  vectorClock: { CLIENT_456: 10 },
});
```

## Why This Works

1. **Mixed State Detection**: Local has no vector clock, remote has vector clock
2. **No Valid Change Counters**: All Lamport values are 0
3. **Falls Back to Timestamps**: Compares `remote.lastUpdate (2000) > local.lastSyncedUpdate (1000)`
4. **Correctly Returns UpdateLocal**: Remote is newer, so download is needed

## Verification

The logic flow with zero Lamport values:

- `hasValidChangeCounters = false` (all values are 0)
- Uses timestamp comparison
- `hasRemoteChanges = true` (2000 > 1000)
- Returns `UpdateLocal` as expected

This fix ensures the test properly validates that vector clock fields are initialized when downloading from a remote that has vector clocks while the local client doesn't.
