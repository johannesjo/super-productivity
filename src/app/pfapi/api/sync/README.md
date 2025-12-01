# Sync System Overview

This directory contains the synchronization implementation for Super Productivity, enabling data sync across devices through various providers (Dropbox, WebDAV, Local File).

## Key Components

### Core Services

- **`sync.service.ts`** - Main orchestrator for sync operations
- **`meta-sync.service.ts`** - Handles sync metadata file operations
- **`model-sync.service.ts`** - Manages individual model synchronization
- **`conflict-handler.service.ts`** - User interface for conflict resolution

### Sync Providers

Located in `sync-providers/`:

- Dropbox
- WebDAV
- Local File System

### Sync Algorithm

The sync system uses vector clocks for accurate conflict detection:

1. **Physical Timestamps** (`lastUpdate`) - For ordering events
2. **Vector Clocks** (`vectorClock`) - For accurate causality tracking and conflict detection
3. **Sync State** (`lastSyncedUpdate`, `lastSyncedVectorClock`) - To track last successful sync

## How Sync Works

### 1. Change Detection

When a user modifies data:

```typescript
// In meta-model-ctrl.ts
lastUpdate = Date.now();
vectorClock[clientId] = vectorClock[clientId] + 1;
```

### 2. Sync Status Determination

The system compares local and remote metadata to determine:

- **InSync**: No changes needed
- **UpdateLocal**: Download remote changes
- **UpdateRemote**: Upload local changes
- **Conflict**: Both have changes (requires user resolution)

### 3. Conflict Detection

Uses vector clocks for accurate detection:

```typescript
const comparison = compareVectorClocks(localVector, remoteVector);
if (comparison === VectorClockComparison.CONCURRENT) {
  // True conflict - changes were made independently
}
```

### 4. Data Transfer

- **Upload**: Sends changed models and updated metadata
- **Download**: Retrieves and merges remote changes
- **Conflict Resolution**: User chooses which version to keep

## Key Files

### Metadata Structure

```typescript
interface LocalMeta {
  lastUpdate: number; // Physical timestamp
  lastSyncedUpdate: number; // Last synced timestamp
  vectorClock?: VectorClock; // Causality tracking
  lastSyncedVectorClock?: VectorClock; // Last synced vector clock
  revMap: RevMap; // Model revision map
  crossModelVersion: number; // Schema version
}
```

### Important Considerations

1. **Vector Clocks**: Each client maintains its own counter for accurate causality tracking
2. **Backwards Compatibility**: Supports migration from older versions
3. **Conflict Minimization**: Vector clocks eliminate false conflicts
4. **Atomic Operations**: Meta file serves as transaction coordinator

## Common Sync Scenarios

### Scenario 1: Simple Update

1. Device A makes changes
2. Device A uploads to cloud
3. Device B downloads changes
4. Both devices now in sync

### Scenario 2: Conflict Resolution

1. Device A and B both make changes
2. Device A syncs first
3. Device B detects conflict
4. User chooses which version to keep
5. Chosen version propagates to all devices

### Scenario 3: Multiple Devices

1. Devices A, B, C all synced
2. Device A makes changes while offline
3. Device B makes different changes
4. Device C acts as intermediary
5. Vector clocks ensure proper ordering

## Debugging Sync Issues

1. Enable verbose logging in `pfapi/api/util/log.ts`
2. Check vector clock states in sync status
3. Verify client IDs are stable
4. Ensure metadata files are properly updated

## Future Improvements

- [ ] Automatic conflict resolution strategies
- [ ] Partial sync for large datasets
- [ ] Real-time sync notifications
- [ ] Sync history visualization

For detailed vector clock documentation, see [vector-clocks.md](../../../docs/sync/vector-clocks.md).
