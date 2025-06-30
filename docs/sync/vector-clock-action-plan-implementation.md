# Vector Clock Sync - Action Plan Implementation

## Phase 1: Critical Fixes (Immediate)

### 1.1 Remove console.log statements

**File**: `src/app/pfapi/api/util/get-sync-status-from-meta-files.ts`

```typescript
// Line 53 - Replace:
console.log('SYNC DEBUG - Vector clock availability check', {
  localHasVectorClock,
  remoteHasVectorClock,
  localVectorClock: local.vectorClock,
  remoteVectorClock: remote.vectorClock,
  hasVectorClocksResult: hasVectorClocks(local, remote),
  localLastUpdate: local.lastUpdate,
  remoteLastUpdate: remote.lastUpdate,
  localLastSyncedUpdate: local.lastSyncedUpdate,
});

// With:
pfLog(2, 'Vector clock availability check', {
  localHasVectorClock,
  remoteHasVectorClock,
  localVectorClock: local.vectorClock,
  remoteVectorClock: remote.vectorClock,
  hasVectorClocksResult: hasVectorClocks(local, remote),
  localLastUpdate: local.lastUpdate,
  remoteLastUpdate: remote.lastUpdate,
  localLastSyncedUpdate: local.lastSyncedUpdate,
});

// Line 72 - Replace:
console.log('SYNC DEBUG - Using vector clocks for sync status', {
  localVector: vectorClockToString(localVector),
  remoteVector: vectorClockToString(remoteVector),
  lastSyncedVector: vectorClockToString(lastSyncedVector),
  localVectorRaw: localVector,
  remoteVectorRaw: remoteVector,
  lastSyncedVectorRaw: lastSyncedVector,
});

// With:
pfLog(2, 'Using vector clocks for sync status', {
  localVector: vectorClockToString(localVector),
  remoteVector: vectorClockToString(remoteVector),
  lastSyncedVector: vectorClockToString(lastSyncedVector),
  localVectorRaw: localVector,
  remoteVectorRaw: remoteVector,
  lastSyncedVectorRaw: lastSyncedVector,
});
```

### 1.2 Add Vector Clock Validation

**File**: `src/app/pfapi/api/util/vector-clock.ts`

Add these functions:

```typescript
/**
 * Validates that a value is a valid VectorClock
 * @param clock The value to validate
 * @returns True if valid vector clock structure
 */
export const isValidVectorClock = (clock: any): clock is VectorClock => {
  if (!clock || typeof clock !== 'object') return false;

  // Check it's not an array or other non-plain object
  if (Array.isArray(clock) || clock.constructor !== Object) return false;

  // Validate all entries
  return Object.entries(clock).every(([key, value]) => {
    // Client ID must be non-empty string
    if (typeof key !== 'string' || key.length === 0) return false;

    // Value must be valid number
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;

    // Value must be non-negative and within safe range
    if (value < 0 || value > Number.MAX_SAFE_INTEGER) return false;

    return true;
  });
};

/**
 * Sanitizes a vector clock, removing invalid entries
 * @param clock The vector clock to sanitize
 * @returns A valid vector clock with invalid entries removed
 */
export const sanitizeVectorClock = (clock: any): VectorClock => {
  if (!clock || typeof clock !== 'object') return {};

  const sanitized: VectorClock = {};

  for (const [key, value] of Object.entries(clock)) {
    if (
      typeof key === 'string' &&
      key.length > 0 &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= Number.MAX_SAFE_INTEGER
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
```

### 1.3 Fix Mixed State Handling

**File**: `src/app/pfapi/api/util/get-sync-status-from-meta-files.ts`

Replace the complex hybrid comparison (lines 122-171) with:

```typescript
// Special case: Mixed vector clock states require user intervention
if (
  (localHasVectorClock && !remoteHasVectorClock) ||
  (!localHasVectorClock && remoteHasVectorClock)
) {
  pfLog(1, 'Mixed vector clock state detected - treating as conflict', {
    localHasVectorClock,
    remoteHasVectorClock,
    localLastUpdate: local.lastUpdate,
    remoteLastUpdate: remote.lastUpdate,
  });

  return {
    status: SyncStatus.Conflict,
    conflictData: {
      reason: ConflictReason.MixedSyncMechanisms,
      remote,
      local,
      additional: {
        localHasVectorClock,
        remoteHasVectorClock,
        message:
          'One device has vector clocks, the other does not. Manual resolution required.',
      },
    },
  };
}
```

## Phase 2: Data Integrity Fixes

### 2.1 Implement Vector Clock Pruning

**File**: `src/app/pfapi/api/util/vector-clock.ts`

Add pruning functionality:

```typescript
/**
 * Information about a client for pruning decisions
 */
export interface ClientActivity {
  lastSeen: number; // Timestamp of last activity
  isPruned?: boolean; // Whether this client was pruned
}

/**
 * Prunes inactive clients from a vector clock
 * @param clock The vector clock to prune
 * @param clientActivity Map of client IDs to activity info
 * @param currentClientId The current client's ID (never prune)
 * @param maxInactiveMs Maximum inactive time before pruning (default 30 days)
 * @returns Pruned vector clock
 */
export const pruneVectorClock = (
  clock: VectorClock,
  clientActivity: Map<string, ClientActivity>,
  currentClientId: string,
  maxInactiveMs: number = 30 * 24 * 60 * 60 * 1000,
): VectorClock => {
  const now = Date.now();
  const pruned: VectorClock = {};

  for (const [clientId, value] of Object.entries(clock)) {
    // Never prune current client
    if (clientId === currentClientId) {
      pruned[clientId] = value;
      continue;
    }

    const activity = clientActivity.get(clientId);

    // Keep if recently active or no activity info (conservative)
    if (!activity || now - activity.lastSeen < maxInactiveMs) {
      pruned[clientId] = value;
    } else {
      pfLog(2, 'Pruning inactive client from vector clock', {
        clientId,
        lastSeen: new Date(activity.lastSeen).toISOString(),
        inactiveDays: Math.floor((now - activity.lastSeen) / (24 * 60 * 60 * 1000)),
      });
    }
  }

  return pruned;
};

/**
 * Updates client activity based on vector clock changes
 * @param clock The vector clock to analyze
 * @param previousClock The previous vector clock state
 * @param clientActivity Map to update with activity info
 */
export const updateClientActivity = (
  clock: VectorClock,
  previousClock: VectorClock | null,
  clientActivity: Map<string, ClientActivity>,
): void => {
  const now = Date.now();

  for (const [clientId, value] of Object.entries(clock)) {
    const previousValue = previousClock?.[clientId] || 0;

    // If value increased, client was active
    if (value > previousValue) {
      clientActivity.set(clientId, {
        lastSeen: now,
        isPruned: false,
      });
    }
  }
};
```

### 2.2 Standardize Empty Handling

**File**: `src/app/pfapi/api/pfapi.model.ts`

Update the interface definitions:

```typescript
export interface LocalMeta {
  // ... existing fields ...

  // Vector clock fields - never null after initialization
  vectorClock: VectorClock; // Remove optional, default to {}
  lastSyncedVectorClock: VectorClock; // Change from VectorClock | null
}

export interface RemoteMeta {
  // ... existing fields ...

  // Vector clock field - never null
  vectorClock: VectorClock; // Remove optional, default to {}
}
```

**File**: `src/app/pfapi/api/util/backwards-compat.ts`

Update the helper functions:

```typescript
// Update withLastSyncedVectorClock to never return null
export const withLastSyncedVectorClock = <T extends LocalMeta | RemoteMeta>(
  meta: T,
  vectorClock: VectorClock | null,
  clientId: string,
): T => {
  // Always use empty object instead of null
  const clockToSet = vectorClock || {};
  const lastSyncedValue = clockToSet[clientId] || 0;

  return {
    ...meta,
    lastSyncedVectorClock: clockToSet, // Never null
    lastSyncedLamport: lastSyncedValue,
    lastSyncedChangeCounter: lastSyncedValue,
  };
};
```

### 2.3 Fix Force Upload Edge Case

**File**: `src/app/pfapi/api/sync/sync.service.ts`

Update the uploadAll method (around line 282):

```typescript
// Replace the try-catch block for remote vector clock fetch with:
if (isForceUpload) {
  // For conflict resolution, we MUST get the remote vector clock
  let remoteMeta: RemoteMeta;
  try {
    const result = await this._metaFileSyncService.download();
    remoteMeta = result.remoteMeta;
  } catch (e) {
    pfLog(0, 'Cannot force upload without remote metadata', e);
    throw new Error(
      'Force upload requires access to remote data. Please check your connection and try again.',
    );
  }

  // Merge vector clocks to preserve all client states
  const remoteVector = getVectorClock(remoteMeta, clientId) || {};
  localVector = mergeVectorClocks(localVector, remoteVector);

  pfLog(2, 'Merged vector clocks for force upload', {
    localOriginal: getVectorClock(local, clientId),
    remote: remoteVector,
    merged: localVector,
  });

  // Continue with the merged vector clock...
}
```

## Phase 3: Add Tests

### 3.1 Test Vector Clock Validation

**File**: `src/app/pfapi/api/util/vector-clock.spec.ts`

Add test cases:

```typescript
describe('isValidVectorClock', () => {
  it('should accept valid vector clocks', () => {
    expect(isValidVectorClock({ client1: 5, client2: 3 })).toBe(true);
    expect(isValidVectorClock({})).toBe(true);
    expect(isValidVectorClock({ single: 0 })).toBe(true);
  });

  it('should reject invalid structures', () => {
    expect(isValidVectorClock(null)).toBe(false);
    expect(isValidVectorClock(undefined)).toBe(false);
    expect(isValidVectorClock('string')).toBe(false);
    expect(isValidVectorClock(123)).toBe(false);
    expect(isValidVectorClock([])).toBe(false);
  });

  it('should reject invalid values', () => {
    expect(isValidVectorClock({ client: -1 })).toBe(false);
    expect(isValidVectorClock({ client: 'string' })).toBe(false);
    expect(isValidVectorClock({ client: null })).toBe(false);
    expect(isValidVectorClock({ client: NaN })).toBe(false);
    expect(isValidVectorClock({ client: Infinity })).toBe(false);
    expect(isValidVectorClock({ client: Number.MAX_SAFE_INTEGER + 1 })).toBe(false);
  });

  it('should reject empty client IDs', () => {
    expect(isValidVectorClock({ '': 5 })).toBe(false);
  });
});

describe('pruneVectorClock', () => {
  it('should remove inactive clients', () => {
    const clock = { active: 5, inactive: 3, current: 7 };
    const activity = new Map([
      ['active', { lastSeen: Date.now() - 1000 }], // Recent
      ['inactive', { lastSeen: Date.now() - 40 * 24 * 60 * 60 * 1000 }], // 40 days old
    ]);

    const result = pruneVectorClock(clock, activity, 'current');

    expect(result).toEqual({ active: 5, current: 7 });
    expect(result.inactive).toBeUndefined();
  });

  it('should never prune current client', () => {
    const clock = { current: 5 };
    const activity = new Map([
      ['current', { lastSeen: 0 }], // Very old
    ]);

    const result = pruneVectorClock(clock, activity, 'current');

    expect(result).toEqual({ current: 5 });
  });
});
```

### 3.2 Test Mixed State Handling

**File**: `src/app/pfapi/api/util/get-sync-status-from-meta-files.spec.ts`

Add test case:

```typescript
it('should treat mixed vector clock states as conflict', () => {
  const local: LocalMeta = {
    lastUpdate: 2000,
    lastSyncedUpdate: 1000,
    vectorClock: { clientA: 5 },
    // ... other required fields
  };

  const remote: RemoteMeta = {
    lastUpdate: 2000,
    localLamport: 3,
    // No vector clock
    // ... other required fields
  };

  const result = getSyncStatusFromMetaFiles(remote, local);

  expect(result.status).toBe(SyncStatus.Conflict);
  expect(result.conflictData?.reason).toBe(ConflictReason.MixedSyncMechanisms);
  expect(result.conflictData?.additional?.localHasVectorClock).toBe(true);
  expect(result.conflictData?.additional?.remoteHasVectorClock).toBe(false);
});
```

## Commit Strategy

Each phase should be committed separately:

```bash
# Phase 1
git add -A
git commit -m "fix: remove console.log and add vector clock validation

- Replace console.log with pfLog for proper log levels
- Add isValidVectorClock and sanitizeVectorClock functions
- Treat mixed vector/Lamport states as conflicts requiring user intervention
- Prevents sync corruption from invalid vector clock data"

# Phase 2
git add -A
git commit -m "feat: add vector clock pruning and standardize empty handling

- Implement pruneVectorClock to remove inactive clients after 30 days
- Track client activity to enable pruning decisions
- Standardize on empty object {} instead of null for vector clocks
- Fix force upload to require remote vector clock for proper merge
- Prevents unbounded vector clock growth"

# Phase 3
git add -A
git commit -m "test: add comprehensive vector clock edge case tests

- Test vector clock validation with invalid inputs
- Test pruning logic with various activity scenarios
- Test mixed state conflict detection
- Ensure robust handling of edge cases"
```

## Next Steps

After implementing these phases:

1. Monitor vector clock sizes in production
2. Consider implementing compression for large vector clocks
3. Add metrics for sync conflicts and resolutions
4. Document the new conflict resolution UI for mixed states
