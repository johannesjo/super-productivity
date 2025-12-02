# PFAPI Sync and Persistence Architecture

This document describes the architecture and implementation of the persistence and synchronization system (PFAPI) in Super Productivity.

## Overview

PFAPI (Persistence Framework API) is a comprehensive system for:

1. **Local Persistence**: Storing application data in IndexedDB
2. **Cross-Device Synchronization**: Syncing data across devices via multiple cloud providers
3. **Conflict Detection**: Using vector clocks for distributed conflict detection
4. **Data Validation & Migration**: Ensuring data integrity across versions

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Angular Application                          │
│                  (Components & Services)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PfapiService (Angular)                       │
│    - Injectable wrapper around Pfapi                            │
│    - Exposes RxJS Observables for UI integration                │
│    - Manages sync provider activation                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Pfapi (Core)                               │
│    - Main orchestrator for all persistence operations           │
│    - Coordinates Database, Models, Sync, and Migration          │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Database    │   │ SyncService   │   │  Migration    │
│   (IndexedDB) │   │ (Orchestrator)│   │   Service     │
└───────────────┘   └───────┬───────┘   └───────────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
               ▼            ▼            ▼
        ┌──────────┐ ┌───────────┐ ┌───────────┐
        │ Meta     │ │ Model     │ │ Encrypt/  │
        │ Sync     │ │ Sync      │ │ Compress  │
        └──────────┘ └───────────┘ └───────────┘
               │            │
               └────────────┼────────────┐
                            │            │
                            ▼            ▼
                    ┌───────────────────────────┐
                    │   SyncProvider Interface  │
                    └───────────────┬───────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│    Dropbox    │         │    WebDAV     │         │  Local File   │
└───────────────┘         └───────────────┘         └───────────────┘
```

## Directory Structure

```
src/app/pfapi/
├── pfapi.service.ts              # Angular service wrapper
├── pfapi-config.ts               # Model and provider configuration
├── pfapi-helper.ts               # RxJS integration helpers
├── api/
│   ├── pfapi.ts                  # Main API class
│   ├── pfapi.model.ts            # Type definitions
│   ├── pfapi.const.ts            # Enums and constants
│   ├── db/                       # Database abstraction
│   │   ├── database.ts           # Database wrapper with locking
│   │   ├── database-adapter.model.ts
│   │   └── indexed-db-adapter.ts # IndexedDB implementation
│   ├── model-ctrl/               # Model controllers
│   │   ├── model-ctrl.ts         # Generic model controller
│   │   └── meta-model-ctrl.ts    # Metadata controller
│   ├── sync/                     # Sync orchestration
│   │   ├── sync.service.ts       # Main sync orchestrator
│   │   ├── meta-sync.service.ts  # Metadata sync
│   │   ├── model-sync.service.ts # Model sync
│   │   ├── sync-provider.interface.ts
│   │   ├── encrypt-and-compress-handler.service.ts
│   │   └── providers/            # Provider implementations
│   ├── migration/                # Data migration
│   ├── util/                     # Utilities (vector-clock, etc.)
│   └── errors/                   # Custom error types
├── migrate/                      # Cross-model migrations
├── repair/                       # Data repair utilities
└── validate/                     # Validation functions
```

## Core Components

### 1. Database Layer

#### Database Class (`api/db/database.ts`)

The `Database` class wraps the storage adapter and provides:

- **Locking mechanism**: Prevents concurrent writes during sync
- **Error handling**: Centralized error management
- **CRUD operations**: `load`, `save`, `remove`, `loadAll`, `clearDatabase`

```typescript
class Database {
  lock(): void; // Prevents writes
  unlock(): void; // Re-enables writes
  load<T>(key: string): Promise<T>;
  save<T>(key: string, data: T, isIgnoreDBLock?: boolean): Promise<void>;
  remove(key: string): Promise<unknown>;
}
```

The database is locked during sync operations to prevent race conditions.

#### IndexedDB Adapter (`api/db/indexed-db-adapter.ts`)

Implements `DatabaseAdapter` interface using IndexedDB:

- Database name: `'pf'`
- Main store: `'main'`
- Uses the `idb` library for async IndexedDB operations

```typescript
class IndexedDbAdapter implements DatabaseAdapter {
  async init(): Promise<IDBPDatabase>; // Opens/creates database
  async load<T>(key: string): Promise<T>; // db.get(store, key)
  async save<T>(key: string, data: T): Promise<void>; // db.put(store, data, key)
  async remove(key: string): Promise<unknown>; // db.delete(store, key)
  async loadAll<A>(): Promise<A>; // Returns all entries as object
  async clearDatabase(): Promise<void>; // db.clear(store)
}
```

## Local Storage Structure (IndexedDB)

All data is stored in a single IndexedDB database with one object store. Each entry is keyed by a string identifier.

### IndexedDB Keys

#### System Keys

| Key                   | Content                   | Description                                             |
| --------------------- | ------------------------- | ------------------------------------------------------- |
| `__meta_`             | `LocalMeta`               | Sync metadata (vector clock, revMap, timestamps)        |
| `__client_id_`        | `string`                  | Unique client identifier (e.g., `"BCL1234567890_12_5"`) |
| `__sp_cred_Dropbox`   | `DropboxPrivateCfg`       | Dropbox credentials                                     |
| `__sp_cred_WebDAV`    | `WebdavPrivateCfg`        | WebDAV credentials                                      |
| `__sp_cred_LocalFile` | `LocalFileSyncPrivateCfg` | Local file sync config                                  |
| `__TMP_BACKUP`        | `AllSyncModels`           | Temporary backup during imports                         |

#### Model Keys (all defined in `pfapi-config.ts`)

| Key              | Content               | Main File | Description                   |
| ---------------- | --------------------- | --------- | ----------------------------- |
| `task`           | `TaskState`           | Yes       | Tasks data (EntityState)      |
| `timeTracking`   | `TimeTrackingState`   | Yes       | Time tracking records         |
| `project`        | `ProjectState`        | Yes       | Projects (EntityState)        |
| `tag`            | `TagState`            | Yes       | Tags (EntityState)            |
| `simpleCounter`  | `SimpleCounterState`  | Yes       | Simple counters (EntityState) |
| `note`           | `NoteState`           | Yes       | Notes (EntityState)           |
| `taskRepeatCfg`  | `TaskRepeatCfgState`  | Yes       | Recurring task configs        |
| `reminders`      | `Reminder[]`          | Yes       | Reminder array                |
| `planner`        | `PlannerState`        | Yes       | Planner state                 |
| `boards`         | `BoardsState`         | Yes       | Kanban boards                 |
| `menuTree`       | `MenuTreeState`       | No        | Menu structure                |
| `globalConfig`   | `GlobalConfigState`   | No        | User settings                 |
| `issueProvider`  | `IssueProviderState`  | No        | Issue tracker configs         |
| `metric`         | `MetricState`         | No        | Metrics (EntityState)         |
| `improvement`    | `ImprovementState`    | No        | Improvements (EntityState)    |
| `obstruction`    | `ObstructionState`    | No        | Obstructions (EntityState)    |
| `pluginUserData` | `PluginUserDataState` | No        | Plugin user data              |
| `pluginMetadata` | `PluginMetaDataState` | No        | Plugin metadata               |
| `archiveYoung`   | `ArchiveModel`        | No        | Recent archived tasks         |
| `archiveOld`     | `ArchiveModel`        | No        | Old archived tasks            |

### Local Storage Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    IndexedDB: "pf"                                │
│                    Store: "main"                                  │
├──────────────────────┬───────────────────────────────────────────┤
│ Key                  │ Value                                     │
├──────────────────────┼───────────────────────────────────────────┤
│ __meta_              │ { lastUpdate, vectorClock, revMap, ... }  │
│ __client_id_         │ "BCLm1abc123_12_5"                        │
│ __sp_cred_Dropbox    │ { accessToken, refreshToken, encryptKey } │
│ __sp_cred_WebDAV     │ { url, username, password, encryptKey }   │
├──────────────────────┼───────────────────────────────────────────┤
│ task                 │ { ids: [...], entities: {...} }           │
│ project              │ { ids: [...], entities: {...} }           │
│ tag                  │ { ids: [...], entities: {...} }           │
│ note                 │ { ids: [...], entities: {...} }           │
│ globalConfig         │ { misc: {...}, keyboard: {...}, ... }     │
│ timeTracking         │ { ... }                                   │
│ planner              │ { ... }                                   │
│ boards               │ { ... }                                   │
│ archiveYoung         │ { task: {...}, timeTracking: {...} }      │
│ archiveOld           │ { task: {...}, timeTracking: {...} }      │
│ ...                  │ ...                                       │
└──────────────────────┴───────────────────────────────────────────┘
```

### How Models Are Saved Locally

When a model is saved via `ModelCtrl.save()`:

```typescript
// 1. Data is validated
if (modelCfg.validate) {
  const result = modelCfg.validate(data);
  if (!result.success && modelCfg.repair) {
    data = modelCfg.repair(data); // Auto-repair if possible
  }
}

// 2. Metadata is updated (if requested via isUpdateRevAndLastUpdate)
// Always:
vectorClock = incrementVectorClock(vectorClock, clientId);
lastUpdate = Date.now();

// Only for NON-main-file models (isMainFileModel: false):
if (!modelCfg.isMainFileModel) {
  revMap[modelId] = Date.now().toString();
}
// Main file models are tracked via mainModelData in the meta file, not revMap

// 3. Data is saved to IndexedDB
await db.put('main', data, modelId); // e.g., key='task', value=TaskState
```

**Important distinction:**

- **Main file models** (`isMainFileModel: true`): Vector clock is incremented, but `revMap` is NOT updated. These models are embedded in `mainModelData` within the meta file.
- **Separate model files** (`isMainFileModel: false`): Both vector clock and `revMap` are updated. The `revMap` entry tracks the revision of the individual remote file.

### 2. Model Control Layer

#### ModelCtrl (`api/model-ctrl/model-ctrl.ts`)

Generic controller for each data model (tasks, projects, tags, etc.):

```typescript
class ModelCtrl<MT extends ModelBase> {
  save(
    data: MT,
    options?: {
      isUpdateRevAndLastUpdate: boolean;
      isIgnoreDBLock?: boolean;
    },
  ): Promise<unknown>;

  load(): Promise<MT>;
  remove(): Promise<unknown>;
}
```

Key behaviors:

- **Validation on save**: Uses Typia for runtime type checking
- **Auto-repair**: Attempts to repair invalid data if `repair` function is provided
- **In-memory caching**: Keeps data in memory for fast reads
- **Revision tracking**: Updates metadata on save when `isUpdateRevAndLastUpdate` is true

#### MetaModelCtrl (`api/model-ctrl/meta-model-ctrl.ts`)

Manages synchronization metadata:

```typescript
interface LocalMeta {
  lastUpdate: number; // Timestamp of last local change
  lastSyncedUpdate: number | null; // Timestamp of last sync
  metaRev: string | null; // Remote metadata revision
  vectorClock: VectorClock; // Client-specific clock values
  lastSyncedVectorClock: VectorClock | null;
  revMap: RevMap; // Model ID -> revision mapping
  crossModelVersion: number; // Data schema version
}
```

Key responsibilities:

- **Client ID management**: Generates and stores unique client identifiers
- **Vector clock updates**: Increments on local changes
- **Revision map tracking**: Tracks which model versions are synced

### 3. Sync Service Layer

#### SyncService (`api/sync/sync.service.ts`)

Main sync orchestrator. The `sync()` method:

1. **Check readiness**: Verify sync provider is configured and authenticated
2. **Operation log sync**: Upload/download operation logs (new feature)
3. **Early return check**: If `lastSyncedUpdate === lastUpdate` and meta revision matches, return `InSync`
4. **Download remote metadata**: Get current remote state
5. **Determine sync direction**: Compare local and remote states using `getSyncStatusFromMetaFiles`
6. **Execute sync**: Upload, download, or report conflict

```typescript
async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }>
```

Possible sync statuses:

- `InSync` - No changes needed
- `UpdateLocal` - Download needed (remote is newer)
- `UpdateRemote` - Upload needed (local is newer)
- `UpdateLocalAll` / `UpdateRemoteAll` - Full sync needed
- `Conflict` - Concurrent changes detected
- `NotConfigured` - No sync provider set

#### MetaSyncService (`api/sync/meta-sync.service.ts`)

Handles metadata file operations:

- `download()`: Gets remote metadata, checks for locks
- `upload()`: Uploads metadata with encryption
- `lock()`: Creates a lock file during multi-file upload
- `getRev()`: Gets remote metadata revision

#### ModelSyncService (`api/sync/model-sync.service.ts`)

Handles individual model file operations:

- `upload()`: Uploads a model with encryption
- `download()`: Downloads a model with revision verification
- `remove()`: Deletes a remote model file
- `getModelIdsToUpdateFromRevMaps()`: Determines which models need syncing

### 4. Vector Clock System

#### Purpose

Vector clocks provide **causality-based conflict detection** for distributed systems. Unlike simple timestamps:

- They detect **concurrent changes** (true conflicts)
- They preserve **happened-before relationships**
- They work without synchronized clocks

#### Implementation (`api/util/vector-clock.ts`)

```typescript
interface VectorClock {
  [clientId: string]: number; // Maps client ID to update count
}

enum VectorClockComparison {
  EQUAL, // Same state
  LESS_THAN, // A happened before B
  GREATER_THAN, // B happened before A
  CONCURRENT, // True conflict - both changed independently
}
```

Key operations:

- `incrementVectorClock(clock, clientId)` - Increment on local change
- `mergeVectorClocks(a, b)` - Take max of each component
- `compareVectorClocks(a, b)` - Determine relationship
- `hasVectorClockChanges(current, reference)` - Check for local changes
- `limitVectorClockSize(clock, clientId)` - Prune to max 50 clients

#### Sync Status Determination (`api/util/get-sync-status-from-meta-files.ts`)

```typescript
function getSyncStatusFromMetaFiles(remote: RemoteMeta, local: LocalMeta) {
  // 1. Check for empty local/remote
  // 2. Compare vector clocks
  // 3. Return appropriate SyncStatus
}
```

The algorithm (simplified - actual implementation has more nuances):

1. **Empty data checks:**

   - If remote has no data (`isRemoteDataEmpty`), return `UpdateRemoteAll`
   - If local has no data (`isLocalDataEmpty`), return `UpdateLocalAll`

2. **Vector clock validation:**

   - If either local or remote lacks a vector clock, return `Conflict` with reason `NoLastSync`
   - Both `vectorClock` and `lastSyncedVectorClock` must be present

3. **Change detection using `hasVectorClockChanges`:**

   - Local changes: Compare current `vectorClock` vs `lastSyncedVectorClock`
   - Remote changes: Compare remote `vectorClock` vs local `lastSyncedVectorClock`

4. **Sync status determination:**
   - No local changes + no remote changes -> `InSync`
   - Local changes only -> `UpdateRemote`
   - Remote changes only -> `UpdateLocal`
   - Both have changes -> `Conflict` with reason `BothNewerLastSync`

**Note:** The actual implementation also handles edge cases like minimal-update bootstrap scenarios and validates that clocks are properly initialized.

### 5. Sync Providers

#### Interface (`api/sync/sync-provider.interface.ts`)

```typescript
interface SyncProviderServiceInterface<PID extends SyncProviderId> {
  id: PID;
  isUploadForcePossible?: boolean;
  isLimitedToSingleFileSync?: boolean;
  maxConcurrentRequests: number;

  getFileRev(targetPath: string, localRev: string | null): Promise<FileRevResponse>;
  downloadFile(targetPath: string): Promise<FileDownloadResponse>;
  uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite?: boolean,
  ): Promise<FileRevResponse>;
  removeFile(targetPath: string): Promise<void>;
  listFiles?(targetPath: string): Promise<string[]>;
  isReady(): Promise<boolean>;
  setPrivateCfg(privateCfg): Promise<void>;
}
```

#### Available Providers

| Provider      | Description                 | Force Upload | Max Concurrent |
| ------------- | --------------------------- | ------------ | -------------- |
| **Dropbox**   | OAuth2 PKCE authentication  | Yes          | 4              |
| **WebDAV**    | Nextcloud, ownCloud, etc.   | No           | 10             |
| **LocalFile** | Electron/Android filesystem | No           | 10             |
| **SuperSync** | WebDAV-based custom sync    | No           | 10             |

### 6. Data Encryption & Compression

#### EncryptAndCompressHandlerService

Handles data transformation before upload/after download:

- **Compression**: Uses compression algorithms to reduce data size
- **Encryption**: AES encryption with user-provided key

Data format prefix: `pf_` indicates processed data.

### 7. Migration System

#### MigrationService (`api/migration/migration.service.ts`)

Handles data schema evolution:

- Checks version on app startup
- Applies cross-model migrations sequentially in order
- **Only supports forward (upgrade) migrations** - throws `CanNotMigrateMajorDownError` if data version is higher than code version (major version mismatch)

```typescript
interface CrossModelMigrations {
  [version: number]: (fullData) => transformedData;
}
```

**Migration behavior:**

- If `dataVersion === codeVersion`: No migration needed
- If `dataVersion < codeVersion`: Run all migrations from `dataVersion` to `codeVersion`
- If `dataVersion > codeVersion` (major version differs): Throws error - downgrade not supported

Current version: `4.4` (from `pfapi-config.ts`)

### 8. Validation & Repair

#### Validation

Uses **Typia** for runtime type validation:

- Each model can define a `validate` function
- Returns `IValidation<T>` with success flag and errors

#### Repair

Auto-repair system for corrupted data:

- Each model can define a `repair` function
- Applied when validation fails
- Falls back to error if repair fails

## Sync Flow Diagrams

### Normal Sync Flow

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│ Device A│       │  Remote │       │ Device B│
└────┬────┘       └────┬────┘       └────┬────┘
     │                 │                 │
     │  1. sync()      │                 │
     ├────────────────►│                 │
     │                 │                 │
     │  2. download    │                 │
     │     metadata    │                 │
     │◄────────────────┤                 │
     │                 │                 │
     │  3. compare     │                 │
     │  vector clocks  │                 │
     │                 │                 │
     │  4. upload      │                 │
     │     changes     │                 │
     ├────────────────►│                 │
     │                 │                 │
     │                 │  5. sync()      │
     │                 │◄────────────────┤
     │                 │                 │
     │                 │  6. download    │
     │                 │     metadata    │
     │                 ├────────────────►│
     │                 │                 │
     │                 │  7. download    │
     │                 │     changed     │
     │                 │     models      │
     │                 ├────────────────►│
```

### Conflict Detection Flow

```
┌─────────┐                     ┌─────────┐
│ Device A│                     │ Device B│
│ VC: {A:5, B:3}                │ VC: {A:4, B:5}
└────┬────┘                     └────┬────┘
     │                               │
     │  Both made changes offline    │
     │                               │
     │     ┌─────────────────────────┼───────────────────────────┐
     │     │  Compare: CONCURRENT    │                           │
     │     │  A has A:5 (higher)     │  B has B:5 (higher)       │
     │     │  Neither dominates      │                           │
     │     └─────────────────────────┴───────────────────────────┘
     │                               │
     │           Conflict!           │
     │    User must choose which     │
     │    version to keep            │
```

### Multi-File Upload with Locking

```
┌─────────┐       ┌─────────┐
│  Client │       │  Remote │
└────┬────┘       └────┬────┘
     │                 │
     │  1. Create lock │
     │  (upload lock   │
     │   content)      │
     ├────────────────►│
     │                 │
     │  2. Upload      │
     │     model A     │
     ├────────────────►│
     │                 │
     │  3. Upload      │
     │     model B     │
     ├────────────────►│
     │                 │
     │  4. Upload      │
     │     metadata    │
     │  (replaces lock)│
     ├────────────────►│
     │                 │
     │  Lock released  │
```

## Remote Storage Structure

The remote storage (Dropbox, WebDAV, local folder) contains multiple files. The structure is designed to optimize sync performance by separating frequently-changed small data from large archives.

### Remote Files Overview

```
/                           (or /DEV/ in development)
├── __meta_                 # Metadata file (REQUIRED - always synced first)
├── globalConfig            # User settings
├── menuTree                # Menu structure
├── issueProvider           # Issue tracker configurations
├── metric                  # Metrics data
├── improvement             # Improvement entries
├── obstruction             # Obstruction entries
├── pluginUserData          # Plugin user data
├── pluginMetadata          # Plugin metadata
├── archiveYoung            # Recent archived tasks (can be large)
└── archiveOld              # Old archived tasks (can be very large)
```

### The Meta File (`__meta_`)

The meta file is the **central coordination file** for sync. It contains:

1. **Sync metadata** (vector clock, timestamps, version)
2. **Revision map** (`revMap`) - tracks which revision each model file has
3. **Main file model data** - frequently-accessed data embedded directly

```typescript
interface RemoteMeta {
  // Sync coordination
  lastUpdate: number; // When data was last changed
  crossModelVersion: number; // Schema version (e.g., 4.4)
  vectorClock: VectorClock; // For conflict detection
  revMap: RevMap; // Model ID -> revision string

  // Embedded data (main file models)
  mainModelData: {
    task: TaskState;
    project: ProjectState;
    tag: TagState;
    note: NoteState;
    timeTracking: TimeTrackingState;
    simpleCounter: SimpleCounterState;
    taskRepeatCfg: TaskRepeatCfgState;
    reminders: Reminder[];
    planner: PlannerState;
    boards: BoardsState;
  };

  // For single-file sync providers
  isFullData?: boolean; // If true, all data is in this file
}
```

### Main File Models vs Separate Model Files

Models are categorized into two types:

#### Main File Models (`isMainFileModel: true`)

These are embedded in the `__meta_` file's `mainModelData` field:

| Model           | Reason                                |
| --------------- | ------------------------------------- |
| `task`          | Frequently accessed, relatively small |
| `project`       | Core data, always needed              |
| `tag`           | Small, frequently referenced          |
| `note`          | Often viewed together with tasks      |
| `timeTracking`  | Frequently updated                    |
| `simpleCounter` | Small, frequently updated             |
| `taskRepeatCfg` | Needed for task creation              |
| `reminders`     | Small array, time-critical            |
| `planner`       | Viewed on app startup                 |
| `boards`        | Part of main UI                       |

**Benefits:**

- Single HTTP request to get all core data
- Atomic update of related models
- Faster initial sync

#### Separate Model Files (`isMainFileModel: false` or undefined)

These are stored as individual files:

| Model                                  | Reason                                      |
| -------------------------------------- | ------------------------------------------- |
| `globalConfig`                         | User-specific, rarely synced                |
| `menuTree`                             | UI state, not critical                      |
| `issueProvider`                        | Contains credentials, separate for security |
| `metric`, `improvement`, `obstruction` | Historical data, can grow large             |
| `archiveYoung`                         | Can be large, changes infrequently          |
| `archiveOld`                           | Very large, rarely accessed                 |
| `pluginUserData`, `pluginMetadata`     | Plugin-specific, isolated                   |

**Benefits:**

- Only download what changed (via `revMap` comparison)
- Large files (archives) don't slow down regular sync
- Can sync individual models independently

### RevMap: Tracking Model Versions

The `revMap` tracks which version of each separate model file is on the remote:

```typescript
interface RevMap {
  [modelId: string]: string;  // Model ID -> revision/timestamp
}

// Example
{
  "globalConfig": "1701234567890",
  "menuTree": "1701234567891",
  "archiveYoung": "1701234500000",
  "archiveOld": "1701200000000",
  // ... (main file models NOT included - they're in mainModelData)
}
```

When syncing:

1. Download `__meta_` file
2. Compare remote `revMap` with local `revMap`
3. Only download model files where revision differs

### Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. Determine what changed (compare local/remote revMaps)
   local.revMap:  { archiveYoung: "100", globalConfig: "200" }
   remote.revMap: { archiveYoung: "100", globalConfig: "150" }
   → globalConfig needs upload

2. For multi-file upload, create lock:
   Upload to __meta_: "SYNC_IN_PROGRESS__BCLm1abc123_12_5"

3. Upload changed model files:
   Upload to globalConfig: { encrypted/compressed data }
   → Get new revision: "250"

4. Upload metadata (replaces lock):
   Upload to __meta_: {
     lastUpdate: 1701234567890,
     vectorClock: { "BCLm1abc123_12_5": 42 },
     revMap: { archiveYoung: "100", globalConfig: "250" },
     mainModelData: { task: {...}, project: {...}, ... }
   }
```

### Download Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOWNLOAD FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. Download __meta_ file
   → Get mainModelData (task, project, tag, etc.)
   → Get revMap for separate files

2. Compare revMaps:
   remote.revMap: { archiveYoung: "300", globalConfig: "250" }
   local.revMap:  { archiveYoung: "100", globalConfig: "250" }
   → archiveYoung needs download

3. Download changed model files (parallel with load balancing):
   Download archiveYoung → decrypt/decompress → save locally

4. Update local metadata:
   - Save all mainModelData to IndexedDB
   - Save downloaded models to IndexedDB
   - Update local revMap to match remote
   - Merge vector clocks
   - Set lastSyncedUpdate = lastUpdate
```

### Single-File Sync Mode

Some providers (or configurations) use `isLimitedToSingleFileSync: true`. In this mode:

- **All data** is stored in the `__meta_` file
- `mainModelData` contains ALL models, not just main file models
- `isFullData: true` flag is set
- No separate model files are created
- Simpler but less efficient for large datasets

### File Content Format

All files are stored as JSON strings with optional encryption/compression:

```
Raw: { "ids": [...], "entities": {...} }
      ↓ (if compression enabled)
Compressed: <binary compressed data>
      ↓ (if encryption enabled)
Encrypted: <AES encrypted data>
      ↓
Prefixed: "pf_" + <base64 encoded data>
```

The `pf_` prefix indicates the data has been processed and needs decryption/decompression.

## Data Model Configurations

From `pfapi-config.ts`:

| Model            | Main File | Description            |
| ---------------- | --------- | ---------------------- |
| `task`           | Yes       | Tasks data             |
| `timeTracking`   | Yes       | Time tracking records  |
| `project`        | Yes       | Projects               |
| `tag`            | Yes       | Tags                   |
| `simpleCounter`  | Yes       | Simple Counters        |
| `note`           | Yes       | Notes                  |
| `taskRepeatCfg`  | Yes       | Recurring task configs |
| `reminders`      | Yes       | Reminders              |
| `planner`        | Yes       | Planner data           |
| `boards`         | Yes       | Kanban boards          |
| `menuTree`       | No        | Menu structure         |
| `globalConfig`   | No        | User settings          |
| `issueProvider`  | No        | Issue tracker configs  |
| `metric`         | No        | Metrics data           |
| `improvement`    | No        | Metric improvements    |
| `obstruction`    | No        | Metric obstructions    |
| `pluginUserData` | No        | Plugin user data       |
| `pluginMetadata` | No        | Plugin metadata        |
| `archiveYoung`   | No        | Recent archive         |
| `archiveOld`     | No        | Old archive            |

**Main file models** are stored in the metadata file itself for faster sync of frequently-accessed data.

## Error Handling

Custom error types in `api/errors/errors.ts`:

- **API Errors**: `NoRevAPIError`, `RemoteFileNotFoundAPIError`, `AuthFailSPError`
- **Sync Errors**: `LockPresentError`, `LockFromLocalClientPresentError`, `UnknownSyncStateError`
- **Data Errors**: `DataValidationFailedError`, `ModelValidationError`, `DataRepairNotPossibleError`

## Event System

```typescript
type PfapiEvents =
  | 'syncDone' // Sync completed
  | 'syncStart' // Sync starting
  | 'syncError' // Sync failed
  | 'syncStatusChange' // Status changed
  | 'metaModelChange' // Metadata updated
  | 'providerChange' // Provider switched
  | 'providerReady' // Provider authenticated
  | 'providerPrivateCfgChange' // Provider credentials updated
  | 'onBeforeUpdateLocal'; // About to download changes
```

## Security Considerations

1. **Encryption**: Optional AES encryption with user-provided key
2. **No tracking**: All data stays local unless explicitly synced
3. **Credential storage**: Provider credentials stored in IndexedDB with prefix `__sp_cred_`
4. **OAuth security**: Dropbox uses PKCE flow

## Key Design Decisions

1. **Vector clocks over timestamps**: More reliable conflict detection in distributed systems
2. **Main file models**: Frequently accessed data bundled with metadata for faster sync
3. **Database locking**: Prevents corruption during sync operations
4. **Adapter pattern**: Easy to add new storage backends
5. **Provider abstraction**: Consistent interface across Dropbox, WebDAV, local files
6. **Typia validation**: Runtime type safety without heavy dependencies

## Future Considerations

The system has been extended with **Operation Log Sync** for more granular synchronization at the operation level rather than full model replacement. See `operation-log-architecture.md` for details.
