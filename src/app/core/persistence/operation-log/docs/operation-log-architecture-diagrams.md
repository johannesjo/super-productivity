# Operation Log: Architecture Diagrams

**Last Updated:** December 16, 2025
**Status:** All core diagrams reflect current implementation

These diagrams visualize the Operation Log system architecture. For implementation details, see [operation-log-architecture.md](./operation-log-architecture.md).

---

## 1. Operation Log Architecture (Local Persistence & Legacy Bridge) ✅ IMPLEMENTED

This diagram illustrates how user actions flow through the system, how they are persisted to IndexedDB (`SUP_OPS`), how the system hydrates on startup, and how it bridges to the legacy PFAPI system.

**Implementation Status:** Complete. See Part A and Part B in [operation-log-architecture.md](./operation-log-architecture.md).

```mermaid
graph TD
    %% Styles
    classDef storage fill:#f9f,stroke:#333,stroke-width:2px,color:black;
    classDef process fill:#e1f5fe,stroke:#0277bd,stroke-width:2px,color:black;
    classDef legacy fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,stroke-dasharray: 5 5,color:black;
    classDef trigger fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:black;
    classDef archive fill:#e8eaf6,stroke:#3949ab,stroke-width:2px,color:black;

    User((User / UI)) -->|Dispatch Action| NgRx["NgRx Store <br/> Runtime Source of Truth<br/><sub>*.effects.ts / *.reducer.ts</sub>"]

    subgraph "Write Path (Runtime)"
        NgRx -->|Action Stream| OpEffects["OperationLogEffects<br/><sub>operation-log.effects.ts</sub>"]

        OpEffects -->|1. Check isPersistent| Filter{"Is Persistent?<br/><sub>persistent-action.interface.ts</sub>"}
        Filter -- No --> Ignore[Ignore / UI Only]
        Filter -- Yes --> Transform["Transform to Operation<br/>UUIDv7, Timestamp, VectorClock<br/><sub>operation-converter.util.ts</sub>"]

        Transform -->|2. Validate| PayloadValid{"Payload<br/>Valid?<br/><sub>processing/validate-operation-payload.ts</sub>"}
        PayloadValid -- No --> ErrorSnack[Show Error Snackbar]
        PayloadValid -- Yes --> DBWrite
    end

    subgraph "Persistence Layer (IndexedDB: SUP_OPS)"
        DBWrite["Write to SUP_OPS<br/><sub>store/operation-log-store.service.ts</sub>"]:::storage

        DBWrite -->|Append| OpsTable["Table: ops<br/>The Event Log<br/><sub>IndexedDB</sub>"]:::storage
        DBWrite -->|Update| StateCache["Table: state_cache<br/>Snapshots<br/><sub>IndexedDB</sub>"]:::storage
    end

    subgraph "Archive Storage (IndexedDB: PFAPI)"
        ArchiveWrite["ArchiveService<br/><sub>time-tracking/archive.service.ts</sub>"]:::archive
        ArchiveWrite -->|Write BEFORE dispatch| ArchiveYoung["archiveYoung<br/>Recent tasks<br/><sub>< 21 days old</sub>"]:::archive
        ArchiveYoung -->|Flush every ~14 days| ArchiveOld["archiveOld<br/>Older tasks<br/><sub>> 21 days old</sub>"]:::archive
        ArchiveOld -->|Contains| TimeTracking["Time Tracking Data<br/>timeSpentOnDay entries"]:::archive
    end

    User -->|Archive Tasks| ArchiveWrite
    NgRx -.->|moveToArchive action<br/>AFTER archive write| OpEffects

    subgraph "Legacy Bridge (PFAPI)"
        DBWrite -.->|3. Bridge| LegacyMeta["META_MODEL<br/>Vector Clock<br/><sub>pfapi.service.ts</sub>"]:::legacy
        LegacyMeta -.->|Update| LegacySync["Legacy Sync Adapters<br/>WebDAV / Dropbox / Local<br/><sub>pfapi.service.ts</sub>"]:::legacy
        noteLegacy[Updates Vector Clock so<br/>Legacy Sync detects changes]:::legacy
    end

    subgraph "Compaction System"
        OpsTable -->|Count > 500| CompactionTrig{"Compaction<br/>Trigger<br/><sub>operation-log.effects.ts</sub>"}:::trigger
        CompactionTrig -->|Yes| Compactor["CompactionService<br/><sub>store/operation-log-compaction.service.ts</sub>"]:::process
        Compactor -->|Read State| NgRx
        Compactor -->|Save Snapshot| StateCache
        Compactor -->|Delete Old Ops| OpsTable
    end

    subgraph "Read Path (Hydration)"
        Startup((App Startup)) --> Hydrator["OperationLogHydrator<br/><sub>store/operation-log-hydrator.service.ts</sub>"]:::process
        Hydrator -->|1. Load| StateCache

        StateCache -->|Check| Schema{"Schema<br/>Version?<br/><sub>store/schema-migration.service.ts</sub>"}
        Schema -- Old --> Migrator["SchemaMigrationService<br/><sub>store/schema-migration.service.ts</sub>"]:::process
        Migrator -->|Transform State| MigratedState
        Schema -- Current --> CurrentState

        CurrentState -->|Load State| StoreInit[Init NgRx State]
        MigratedState -->|Load State| StoreInit

        Hydrator -->|2. Load Tail| OpsTable
        OpsTable -->|Replay Ops| Replayer["OperationApplier<br/><sub>processing/operation-applier.service.ts</sub>"]:::process
        Replayer -->|Dispatch| NgRx
    end

    subgraph "Single Instance + Sync Locking"
        Startup2((App Startup)) -->|BroadcastChannel| SingleCheck{"Already<br/>Open?<br/><sub>startup.service.ts</sub>"}
        SingleCheck -- Yes --> Block[Block New Tab]
        SingleCheck -- No --> Allow[Allow]

        DBWrite -.->|Critical ops use| WebLocks["Web Locks API<br/><sub>sync/lock.service.ts</sub>"]
    end

    class OpsTable,StateCache storage;
    class LegacyMeta,LegacySync,noteLegacy legacy;
    class ArchiveWrite,ArchiveYoung,ArchiveOld,TimeTracking archive;
```

**Archive Data Flow Notes:**

- **Archive writes happen BEFORE dispatch**: When a user archives tasks, `ArchiveService` writes to IndexedDB first, then dispatches the `moveToArchive` action. This ensures data is safely stored before state updates.
- **Two-tier archive**: Recent tasks go to `archiveYoung`. Tasks older than 21 days are flushed to `archiveOld` via `flushYoungToOld` (checked every ~14 days when archiving tasks).
- **Time tracking data**: Stored with archived tasks as `timeSpentOnDay` entries.
- **Not in NgRx state**: Archive data is stored directly in IndexedDB (via PFAPI), not in the NgRx store. Only the operation (moveToArchive) is logged for sync.
- **Sync handling**: On remote clients, `ArchiveOperationHandler` writes archive data AFTER receiving the operation (see Section 8).

## 2. Operation Log Sync Architecture (Server Sync) ✅ IMPLEMENTED

This diagram details the flow for syncing individual operations with a server (`Part C`), including conflict detection, resolution strategies, and the validation loop (`Part D`).

**Implementation Status:** Complete (single-schema-version). Key services:

- `OperationLogSyncService` - Orchestration, fresh client safety checks
- `OperationLogUploadService` / `OperationLogDownloadService` - Data transfer (API + file-based fallback)
- `ConflictResolutionService` - User resolution UI, batch apply
- `VectorClockService` - Conflict detection, frontier tracking
- `DependencyResolverService` - Hard/soft dependency extraction

**Recent Additions (December 2025):**

- Server-side security: audit logging, error codes, deduplication, validation
- Gap detection in download operations
- Transaction isolation for downloads
- Full-state operations (BackupImport, Repair, SyncImport) routed via snapshot endpoint

```mermaid
graph TD
    %% Styles
    classDef remote fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:black;
    classDef local fill:#fff,stroke:#333,stroke-width:2px,color:black;
    classDef conflict fill:#ffebee,stroke:#c62828,stroke-width:2px,color:black;
    classDef repair fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:black;

    subgraph "Remote Server"
        ServerDB[(Server Database)]:::remote
        API[Sync API Endpoint]:::remote
    end

    subgraph "Client: Sync Loop"
        Scheduler((Scheduler)) -->|Interval| SyncService["OperationLogSyncService<br/><sub>sync/operation-log-sync.service.ts</sub>"]

        SyncService -->|1. Get Last Seq| LocalMeta["Sync Metadata<br/><sub>store/operation-log-store.service.ts</sub>"]

        %% Download Flow
        SyncService -->|2. Download Ops| API
        API -->|Return Ops > Seq| DownOps[Downloaded Operations]

        DownOps --> FilterApplied{Already<br/>Applied?}
        FilterApplied -- Yes --> Discard[Discard]
        FilterApplied -- No --> ConflictDet
    end

    subgraph "Client: Conflict Management"
        ConflictDet{"Conflict<br/>Detection<br/><sub>sync/conflict-resolution.service.ts</sub>"}:::conflict

        ConflictDet -->|Check Vector Clocks| VCCheck[Entity-Level Check]

        VCCheck -- Concurrent --> ConflictFound[Conflict Found!]:::conflict
        VCCheck -- Sequential --> NoConflict[No Conflict]

        ConflictFound --> UserDialog["User Resolution Dialog<br/><sub>dialog-conflict-resolution.component.ts</sub>"]:::conflict

        UserDialog -- "Keep Remote" --> MarkRejected[Mark Local Ops<br/>as Rejected]:::conflict
        MarkRejected --> ApplyRemote[Apply Remote Ops]

        UserDialog -- "Keep Local" --> IgnoreRemote[Ignore Remote Ops]

        NoConflict --> ApplyRemote
    end

    subgraph "Client: Application & Validation"
        ApplyRemote -->|Apply to Store| Store[NgRx Store]

        Store -->|Post-Apply| Validator{"Validate<br/>State?<br/><sub>processing/validate-state.service.ts</sub>"}:::repair

        Validator -- Valid --> Done((Sync Done))
        Validator -- Invalid --> Repair["Auto-Repair Service<br/><sub>processing/repair-operation.service.ts</sub>"]:::repair

        Repair -->|Fix Data| RepairedState
        Repair -->|Create Op| RepairOp[Create REPAIR Op]:::repair
        RepairOp -->|Append| OpLog[(SUP_OPS)]
        RepairedState -->|Update| Store
    end

    subgraph "Client: Upload Flow"
        OpLog -->|Get Unsynced| PendingOps[Pending Ops]
        PendingOps -->|Filter| FilterRejected{Is<br/>Rejected?}

        FilterRejected -- Yes --> Skip[Skip Upload]
        FilterRejected -- No --> ClassifyOp{Op Type?}

        ClassifyOp -- "BackupImport<br/>Repair<br/>SyncImport" --> SnapshotUpload[Upload via<br/>/api/sync/snapshot]
        ClassifyOp -- "Other" --> UploadBatch[Batch for Upload]

        SnapshotUpload -->|3a. Upload State| API
        UploadBatch -->|3b. Upload| API
        API -->|Ack| ServerAck[Server Acknowledgement]
        ServerAck -->|Update| MarkSynced[Mark Ops Synced]
        MarkSynced --> OpLog
    end

    API <--> ServerDB
```

## 2b. Full-State Operations via Snapshot Endpoint ✅ IMPLEMENTED

Full-state operations (BackupImport, Repair, SyncImport) contain the entire application state and can exceed the regular `/api/sync/ops` body size limit (~30MB). These operations are routed through the `/api/sync/snapshot` endpoint instead.

**Implementation Status:** Complete. See `OperationLogUploadService._uploadFullStateOpAsSnapshot()`.

```mermaid
flowchart TB
    subgraph "Upload Decision Flow"
        GetUnsynced[Get Unsynced Operations<br/>from IndexedDB]
        Classify{Classify by OpType}

        GetUnsynced --> Classify

        subgraph FullStateOps["Full-State Operations"]
            SyncImport[OpType.SyncImport]
            BackupImport[OpType.BackupImport]
            Repair[OpType.Repair]
        end

        subgraph RegularOps["Regular Operations"]
            CRT[OpType.CRT]
            UPD[OpType.UPD]
            DEL[OpType.DEL]
            MOV[OpType.MOV]
            BATCH[OpType.BATCH]
        end

        Classify --> FullStateOps
        Classify --> RegularOps

        FullStateOps --> SnapshotPath
        RegularOps --> OpsPath

        subgraph SnapshotPath["Snapshot Endpoint Path"]
            MapReason["Map OpType to reason:<br/>SyncImport → 'initial'<br/>BackupImport → 'recovery'<br/>Repair → 'recovery'"]
            Encrypt1{E2E Encryption<br/>Enabled?}
            EncryptPayload[Encrypt state payload]
            UploadSnapshot["POST /api/sync/snapshot<br/>{state, clientId, reason,<br/>vectorClock, schemaVersion}"]
        end

        subgraph OpsPath["Ops Endpoint Path"]
            Encrypt2{E2E Encryption<br/>Enabled?}
            EncryptOps[Encrypt operation payloads]
            Batch[Batch up to 100 ops]
            UploadOps["POST /api/sync/ops<br/>{ops[], clientId, lastKnownSeq}"]
        end

        MapReason --> Encrypt1
        Encrypt1 -- Yes --> EncryptPayload
        Encrypt1 -- No --> UploadSnapshot
        EncryptPayload --> UploadSnapshot

        Encrypt2 -- Yes --> EncryptOps
        Encrypt2 -- No --> Batch
        EncryptOps --> Batch
        Batch --> UploadOps
    end

    UploadSnapshot --> MarkSynced[Mark Operation as Synced]
    UploadOps --> MarkSynced

    style FullStateOps fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style RegularOps fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style SnapshotPath fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style OpsPath fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

**Why This Matters:**

1. **Body Size Limits**: Regular `/api/sync/ops` has a ~30MB limit which backup imports can exceed
2. **Efficiency**: Snapshot endpoint is designed for large payloads and stores state directly
3. **Server-Side Handling**: Server creates a synthetic operation record for audit purposes

## 2c. Late-Joiner Replay with Vector Clock Dominance ✅ IMPLEMENTED

When a client receives a SYNC_IMPORT (full state from another client), it must replay any local synced operations that happened "after" the import's vector clock. This ensures local work isn't lost when receiving a full state snapshot.

**Implementation Status:** Complete. See `OperationLogSyncService._replayLocalSyncedOpsAfterImport()`.

### The Late-Joiner Problem

```mermaid
sequenceDiagram
    participant A as Client A
    participant S as Server
    participant B as Client B

    Note over A,B: Both start synced

    A->>S: Upload Op1 (task created)
    A->>S: Upload Op2 (task updated)

    Note over B: Client B is offline

    B->>B: Make local changes (Op3, Op4)
    B->>S: Upload Op3, Op4

    Note over B: Client B comes online, receives SYNC_IMPORT from A

    S->>B: SYNC_IMPORT (A's full state)

    Note over B: Problem: Op3, Op4 were already synced!<br/>If we just apply SYNC_IMPORT, we lose B's work
```

### The Solution: Vector Clock Dominance Filter

Before replaying local synced ops after a SYNC_IMPORT, we filter out ops that are "dominated" by the SYNC_IMPORT's vector clock. An op is dominated if its vector clock is `LESS_THAN` the SYNC_IMPORT's clock - meaning the op's state is already captured in the imported snapshot.

```mermaid
flowchart TD
    subgraph Input["SYNC_IMPORT Received"]
        SI["SYNC_IMPORT<br/>vectorClock: A=10, B=5"]
    end

    subgraph LocalOps["Local Synced Operations"]
        Op1["Op1: B=1<br/>LESS_THAN → dominated"]
        Op2["Op2: A=5, B=3<br/>LESS_THAN → dominated"]
        Op3["Op3: B=6<br/>GREATER_THAN → NOT dominated"]
        Op4["Op4: A=10, B=5, C=1<br/>CONCURRENT → NOT dominated"]
    end

    subgraph Filter["Vector Clock Comparison"]
        Check["Compare each op's clock<br/>with SYNC_IMPORT clock"]
    end

    subgraph Result["Ops to Replay"]
        Replay["Only Op3 and Op4<br/>not dominated"]
    end

    SI --> Check
    LocalOps --> Check
    Check --> |"LESS_THAN"| Skip["Skip - already in snapshot"]
    Check --> |"Otherwise"| Replay

    style Op1 fill:#ffcdd2,stroke:#c62828
    style Op2 fill:#ffcdd2,stroke:#c62828
    style Op3 fill:#c8e6c9,stroke:#2e7d32
    style Op4 fill:#c8e6c9,stroke:#2e7d32
    style Skip fill:#ffebee,stroke:#c62828
    style Replay fill:#e8f5e9,stroke:#2e7d32
```

### Vector Clock Comparison Results

| Comparison     | Meaning                        | Action                             |
| -------------- | ------------------------------ | ---------------------------------- |
| `LESS_THAN`    | Op happened-before SYNC_IMPORT | Skip (state already captured)      |
| `EQUAL`        | Same causal history            | Replay (edge case, safe to replay) |
| `GREATER_THAN` | Op happened-after SYNC_IMPORT  | Replay (newer than snapshot)       |
| `CONCURRENT`   | Independent changes            | Replay (may have unique changes)   |

### Implementation Details

```typescript
// In OperationLogSyncService._replayLocalSyncedOpsAfterImport()
const localSyncedOps = allEntries.filter((entry) => {
  // Must be created by this client
  if (entry.op.clientId !== clientId) return false;
  // Must be synced (accepted by server)
  if (!entry.syncedAt) return false;
  // Must NOT be a full-state op itself
  if (entry.op.opType === OpType.SyncImport || entry.op.opType === OpType.BackupImport)
    return false;

  // Must NOT be dominated by the SYNC_IMPORT's vector clock
  const comparison = compareVectorClocks(entry.op.vectorClock, syncImportClock);
  if (comparison === VectorClockComparison.LESS_THAN) {
    return false; // Skip - state already captured in SYNC_IMPORT
  }
  return true;
});
```

**Key Points:**

- Only filters local ops (created by this client)
- Only considers synced ops (accepted by server)
- Uses vector clock comparison to determine dominance
- `LESS_THAN` means dominated (skip), all other results mean not dominated (replay)

---

## 3. Conflict-Aware Migration Strategy (The Migration Shield)

> **Note:** Sections 3, 4.1, and 4.2 describe the **cross-version migration strategy** (A.7.8) which is designed but not yet implemented. Currently `CURRENT_SCHEMA_VERSION = 1`, so all clients are on the same version. State cache snapshots are migrated via `SchemaMigrationService.migrateIfNeeded()`. Individual operation migration will be needed when schema versions diverge between clients.

This diagram visualizes the "Receiver-Side Migration" strategy. The Migration Layer acts as a shield, ensuring that _only_ operations matching the current schema version ever reach the core conflict detection and application logic.

```mermaid
graph TD
    %% Nodes
    subgraph "Sources of Operations (Mixed Versions)"
        Remote[Remote Client Sync]:::src
        Disk[Local Disk Tail Ops]:::src
    end

    subgraph "Migration Layer (The Shield)"
        Check{"Is Op Old?<br/>(vOp < vCurrent)"}:::logic
        Migrate["Run migrateOperation()<br/>Pipeline"]:::action
        CheckDrop{"Result is<br/>Null?"}:::logic
        Pass["Pass Through"]:::pass
    end

    subgraph "Core System (Current Version Only)"
        Conflict["Conflict Detection<br/>(Apples-to-Apples)"]:::core
        Apply["Apply to State"]:::core
    end

    %% Flow
    Remote --> Check
    Disk --> Check

    Check -- Yes --> Migrate
    Check -- No --> Pass

    Migrate --> CheckDrop
    CheckDrop -- Yes --> Drop[("🗑️ Drop Op<br/>(Destructive Change)")]:::drop
    CheckDrop -- No --> Conflict

    Pass --> Conflict
    Conflict --> Apply

    %% Styles
    classDef src fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef logic fill:#fff,stroke:#333,stroke-width:2px;
    classDef action fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef pass fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef drop fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5;
    classDef core fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
```

## 4. Migration Scenarios

### 4.1 Tail Ops Migration (Local Startup Consistency)

Ensures that operations occurring after a snapshot ("Tail Ops") are migrated to the current version before being applied to the migrated state.

<details>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    participant IDB as IndexedDB (SUP_OPS)
    participant Hydrator as OpLogHydrator
    participant Migrator as SchemaMigrationService
    participant Applier as OperationApplier
    participant Store as NgRx Store

    Note over IDB, Store: App Updated from V1 -> V2

    Hydrator->>IDB: Load Snapshot (Version 1)
    IDB-->>Hydrator: Returns Snapshot V1

    Hydrator->>Migrator: migrateIfNeeded(Snapshot V1)
    Migrator-->>Hydrator: Returns Migrated Snapshot (Version 2)

    Hydrator->>Store: Load Initial State (V2)

    Hydrator->>IDB: Load Tail Ops (Version 1)
    Note right of IDB: Ops created after snapshot<br/>but before update
    IDB-->>Hydrator: Returns Ops [OpA(v1), OpB(v1)]

    loop For Each Op
        Hydrator->>Migrator: migrateOperation(Op V1)
        Migrator-->>Hydrator: Returns Op V2 (or null)

        alt Op was Dropped (null)
            Hydrator->>Hydrator: Ignore
        else Op Migrated
            Hydrator->>Applier: Apply(Op V2)
            Applier->>Store: Dispatch Action (V2 Payload)
        end
    end

    Note over Store: State matches V2 Schema<br/>Consistency Preserved
```

</details>

<details>
<summary>Flowchart Diagram</summary>

```mermaid
graph TD
    subgraph "Hydration & Migration"
        direction TB
        Start((App Start)) --> LoadSnap["Load Snapshot<br/>(Version V1)"]
        LoadSnap --> CheckVer{"Schema<br/>Version?"}

        CheckVer -- Match --> LoadState
        CheckVer -- Old --> MigrateSnap["migrateIfNeeded()<br/>Upgrade V1 -> V2"]
        MigrateSnap --> LoadState["Init NgRx State<br/>(Version V2)"]

        LoadState --> LoadTail["Load Tail Ops<br/>(Version V1)"]
        LoadTail --> Iterate{Next Op?}

        Iterate -- No --> Done((Ready))
        Iterate -- Yes --> MigOp["migrateOperation(Op V1)"]

        MigOp --> NullCheck{Result?}
        NullCheck -- Null --> Drop[Drop Op]
        NullCheck -- Valid --> Apply[Apply Op V2]

        Drop --> Iterate
        Apply --> Iterate
    end

    classDef process fill:#e1f5fe,stroke:#0277bd,stroke-width:2px;
    classDef decision fill:#fff,stroke:#333,stroke-width:2px;
    class LoadSnap,MigrateSnap,LoadState,LoadTail,MigOp,Apply process;
    class CheckVer,Iterate,NullCheck decision;
```

</details>

### 4.2 Receiver-Side Sync Migration

Demonstrates how a client on V2 handles incoming data from a client still on V1.

<details>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    participant Remote as Remote Client (V1)
    participant Server as Sync Server
    participant Local as Local Client (V2)
    participant Conflict as Conflict Detector

    Remote->>Server: Upload Operation (Version 1)<br/>{ payload: { oldField: 'X' } }
    Server-->>Local: Download Operation (Version 1)

    Note over Local: Client V2 receives V1 data

    Local->>Local: Check Op Schema Version (v1 < v2)
    Local->>Local: Call SchemaMigrationService.migrateOperation()

    Note over Local: Transforms payload:<br/>{ oldField: 'X' } -> { newField: 'X' }

    Local->>Conflict: detectConflicts(Remote Op V2)

    alt Conflict Detected
        Conflict->>Local: Show Dialog (V2 vs V2 comparison)
    else No Conflict
        Local->>Local: Apply Operation (V2)
    end
```

</details>

<details>
<summary>Flowchart Diagram</summary>

```mermaid
graph TD
    subgraph "Remote"
        RemoteClient["Remote Client<br/>(Version V1)"] -->|Upload| Server[(Server)]
    end

    subgraph "Local Client (Version V2)"
        Server -->|Download| InOp["Incoming Op<br/>(Version V1)"]
        InOp --> CheckSchema{"Schema<br/>Check"}

        CheckSchema -- "V1 < V2" --> Migrate["migrateOperation()<br/>Upgrade V1 -> V2"]
        CheckSchema -- "V1 == V2" --> Conflict

        Migrate --> NullCheck{Result?}
        NullCheck -- Null --> Discard[Discard Op]
        NullCheck -- Valid --> Conflict

        Conflict{"Conflict<br/>Detection"}
        Conflict -- "No Conflict" --> Apply[Apply Op V2]
        Conflict -- "Conflict" --> Resolve[Resolution Dialog]
    end

    classDef remote fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef local fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decision fill:#fff,stroke:#333,stroke-width:2px;

    class RemoteClient,Server remote;
    class InOp,Migrate,Apply,Resolve,Discard local;
    class CheckSchema,NullCheck,Conflict decision;
```

</details>

## 5. Hybrid Manifest (File-Based Sync) ✅ IMPLEMENTED

This diagram illustrates the "Hybrid Manifest" optimization (`hybrid-manifest-architecture.md`) which reduces HTTP request overhead for WebDAV/Dropbox sync by buffering small operations directly inside the manifest file.

**Implementation Status:** Complete. Managed by `OperationLogManifestService` with remote cleanup after 14 days.

```mermaid
graph TD
    %% Nodes
    subgraph "Hybrid Manifest File (JSON)"
        ManVer[Version: 2]:::file
        SnapRef[Last Snapshot: 'snap_123.json']:::file
        Buffer[Embedded Ops Buffer<br/>Op1, Op2, ...]:::buffer
        ExtFiles[External Files List<br/>ops_A.json, ...]:::file
    end

    subgraph "Sync Logic (Upload Path)"
        Start((Start Sync)) --> ReadMan[Download Manifest]
        ReadMan --> CheckSize{Buffer Full?<br/>more than 50 ops}

        CheckSize -- No --> AppendBuffer[Append to<br/>Embedded Ops]:::action
        AppendBuffer --> WriteMan[Upload Manifest]:::io

        CheckSize -- Yes --> Flush[Flush Buffer]:::action
        Flush --> CreateFile[Create 'ops_NEW.json'<br/>with old buffer content]:::io
        CreateFile --> UpdateRef[Add 'ops_NEW.json'<br/>to External Files]:::action
        UpdateRef --> ClearBuffer[Clear Buffer &<br/>Add Pending Ops]:::action
        ClearBuffer --> WriteMan
    end

    %% Styles
    classDef file fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef buffer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef io fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
```

## 6. Hybrid Manifest Conceptual Overview ✅ IMPLEMENTED

This diagram shows the Hybrid Manifest architecture: how operations flow from "hot" (recent, in manifest) to "cold" (archived files) to "frozen" (snapshot), and the decision logic for each transition.

**Implementation Status:** Complete. Used by `OperationLogUploadService` and `OperationLogDownloadService` for file-based sync providers (WebDAV, Dropbox).

### 6.1 Data Lifecycle: Hot → Cold → Frozen

```mermaid
graph LR
    subgraph "HOT: Manifest Buffer"
        direction TB
        Buffer["embeddedOperations[]<br/>━━━━━━━━━━━━━━━<br/>• Op 47<br/>• Op 48<br/>• Op 49<br/>━━━━━━━━━━━━━━━<br/>~50 ops max"]
    end

    subgraph "COLD: Operation Files"
        direction TB
        Files["operationFiles[]<br/>━━━━━━━━━━━━━━━<br/>• overflow_001.json<br/>• overflow_002.json<br/>• overflow_003.json<br/>━━━━━━━━━━━━━━━<br/>~50 files max"]
    end

    subgraph "FROZEN: Snapshot"
        direction TB
        Snap["lastSnapshot<br/>━━━━━━━━━━━━━━━<br/>snap_170789.json<br/>━━━━━━━━━━━━━━━<br/>Full app state"]
    end

    NewOp((New Op)) -->|"Always"| Buffer
    Buffer -->|"When full<br/>(overflow)"| Files
    Files -->|"When too many<br/>(compaction)"| Snap

    style Buffer fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Files fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Snap fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style NewOp fill:#fff,stroke:#333,stroke-width:2px
```

### 6.2 Manifest File Structure

```mermaid
graph TB
    subgraph Manifest["manifest.json"]
        direction TB

        V["version: 2"]
        FC["frontierClock: { A: 5, B: 3 }"]

        subgraph SnapRef["lastSnapshot (optional)"]
            SF["fileName: 'snap_170789.json'"]
            SV["vectorClock: { A: 2, B: 1 }"]
        end

        subgraph EmbeddedOps["embeddedOperations[] — THE BUFFER"]
            E1["Op { id: 'abc', entityType: 'TASK', ... }"]
            E2["Op { id: 'def', entityType: 'PROJECT', ... }"]
            E3["...up to 50 ops"]
        end

        subgraph OpFiles["operationFiles[] — OVERFLOW REFERENCES"]
            F1["{ fileName: 'overflow_001.json', opCount: 100 }"]
            F2["{ fileName: 'overflow_002.json', opCount: 100 }"]
        end
    end

    style Manifest fill:#fff,stroke:#333,stroke-width:3px
    style EmbeddedOps fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style OpFiles fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style SnapRef fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### 6.3 Write Path: Buffer vs Overflow Decision

```mermaid
flowchart TD
    Start([Client has pending ops]) --> Download[Download manifest.json]
    Download --> CheckRemote{Remote has<br/>new ops?}

    CheckRemote -->|Yes| ApplyFirst[Download & apply<br/>remote ops first]
    ApplyFirst --> CheckBuffer
    CheckRemote -->|No| CheckBuffer

    CheckBuffer{Buffer + Pending<br/>< 50 ops?}

    CheckBuffer -->|Yes| FastPath
    CheckBuffer -->|No| SlowPath

    subgraph FastPath["⚡ FAST PATH (1 request)"]
        Append[Append pending to<br/>embeddedOperations]
        Append --> Upload1[Upload manifest.json]
    end

    subgraph SlowPath["📦 OVERFLOW PATH (2 requests)"]
        Flush[Upload embeddedOperations<br/>as overflow_XXX.json]
        Flush --> AddRef[Add file to operationFiles]
        AddRef --> Clear[Put pending ops in<br/>now-empty buffer]
        Clear --> Upload2[Upload manifest.json]
    end

    Upload1 --> CheckSnap
    Upload2 --> CheckSnap

    CheckSnap{Files > 50 OR<br/>Ops > 5000?}
    CheckSnap -->|Yes| Compact[Trigger Compaction]
    CheckSnap -->|No| Done([Done])
    Compact --> Done

    style FastPath fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style SlowPath fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Start fill:#fff,stroke:#333
    style Done fill:#fff,stroke:#333
```

### 6.4 Read Path: Reconstructing State

```mermaid
flowchart TD
    Start([Client checks for updates]) --> Download[Download manifest.json]

    Download --> QuickCheck{frontierClock<br/>changed?}
    QuickCheck -->|No| Done([No changes - done])

    QuickCheck -->|Yes| NeedSnap{Local behind<br/>snapshot?}

    NeedSnap -->|Yes| LoadSnap
    NeedSnap -->|No| LoadFiles

    subgraph LoadSnap["🧊 Load Snapshot (fresh install / behind)"]
        DownSnap[Download snapshot file]
        DownSnap --> ApplySnap[Apply as base state]
    end

    ApplySnap --> LoadFiles

    subgraph LoadFiles["📁 Load Operation Files"]
        FilterFiles[Filter to unseen files only]
        FilterFiles --> DownFiles[Download each file]
        DownFiles --> CollectOps[Collect all operations]
    end

    CollectOps --> LoadEmbed

    subgraph LoadEmbed["⚡ Load Embedded Ops"]
        FilterEmbed[Filter by op.id<br/>skip already-applied]
        FilterEmbed --> AddOps[Add to collected ops]
    end

    AddOps --> Apply

    subgraph Apply["✅ Apply All"]
        Sort[Sort by vectorClock]
        Sort --> Detect[Detect conflicts]
        Detect --> ApplyOps[Apply non-conflicting]
    end

    ApplyOps --> UpdateClock[Update local<br/>lastSyncedClock]
    UpdateClock --> Done2([Done])

    style LoadSnap fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style LoadFiles fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style LoadEmbed fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style Apply fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

### 6.5 Compaction: Freezing State

```mermaid
flowchart TD
    Trigger{{"Trigger Conditions"}}
    Trigger --> C1["operationFiles > 50"]
    Trigger --> C2["Total ops > 5000"]
    Trigger --> C3["7+ days since snapshot"]

    C1 --> Start
    C2 --> Start
    C3 --> Start

    Start([Begin Compaction]) --> Sync[Ensure full sync<br/>no pending ops]
    Sync --> Read[Read current state<br/>from NgRx]
    Read --> Generate[Generate snapshot file<br/>+ checksum]
    Generate --> UpSnap[Upload snapshot file]

    UpSnap --> UpdateMan

    subgraph UpdateMan["Update Manifest"]
        SetSnap[Set lastSnapshot →<br/>new file reference]
        SetSnap --> ClearFiles[Clear operationFiles]
        ClearFiles --> ClearBuffer[Clear embeddedOperations]
        ClearBuffer --> ResetClock[Set frontierClock →<br/>snapshot's clock]
    end

    UpdateMan --> UpMan[Upload manifest.json]
    UpMan --> Cleanup[Async: Delete old files<br/>from server]
    Cleanup --> Done([Done])

    style Trigger fill:#ffebee,stroke:#c62828,stroke-width:2px
    style UpdateMan fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## 7. Atomic State Consistency (Meta-Reducer Pattern) ✅ IMPLEMENTED

This diagram illustrates how meta-reducers ensure atomic state changes across multiple entities, preventing inconsistency during sync. See Part F in [operation-log-architecture.md](./operation-log-architecture.md).

**Implementation Status:** Complete. Key files:

- `tag-shared.reducer.ts` - Tag deletion with task/repeat-cfg/time-tracking cleanup
- `state-capture.meta-reducer.ts` - Before-state capture for multi-entity operations
- `state-change-capture.service.ts` - Computes entity changes from state diff

### 7.1 Meta-Reducer Flow for Multi-Entity Operations

```mermaid
flowchart TD
    subgraph UserAction["User Action (e.g., Delete Tag)"]
        Action[deleteTag action]
    end

    subgraph MetaReducers["Meta-Reducer Chain (Atomic)"]
        Capture["stateCaptureMetaReducer<br/>━━━━━━━━━━━━━━━<br/>Captures before-state"]
        TagMeta["tagSharedMetaReducer<br/>━━━━━━━━━━━━━━━<br/>• Remove tag from tasks<br/>• Delete orphaned tasks<br/>• Clean TaskRepeatCfgs<br/>• Clean TimeTracking"]
        OtherMeta["Other meta-reducers<br/>━━━━━━━━━━━━━━━<br/>Pass through"]
    end

    subgraph FeatureReducers["Feature Reducers"]
        TagReducer["tag.reducer<br/>━━━━━━━━━━━━━━━<br/>Delete tag entity"]
    end

    subgraph Effects["Effects Layer"]
        OpEffect["OperationLogEffects<br/>━━━━━━━━━━━━━━━<br/>• Compute state diff<br/>• Create single Operation<br/>• with entityChanges[]"]
    end

    subgraph Result["Single Atomic Operation"]
        Op["Operation {<br/>  opType: 'DEL',<br/>  entityType: 'TAG',<br/>  entityChanges: [<br/>    {TAG, delete},<br/>    {TASK, update}x3,<br/>    {TASK_REPEAT_CFG, delete}<br/>  ]<br/>}"]
    end

    Action --> Capture
    Capture --> TagMeta
    TagMeta --> OtherMeta
    OtherMeta --> FeatureReducers
    FeatureReducers --> OpEffect
    OpEffect --> Result

    style UserAction fill:#fff,stroke:#333,stroke-width:2px
    style MetaReducers fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FeatureReducers fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Effects fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Result fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

### 7.2 Why Meta-Reducers vs Effects

```mermaid
flowchart LR
    subgraph Problem["❌ Effects Pattern (Non-Atomic)"]
        direction TB
        A1[deleteTag action] --> E1[tag.reducer]
        E1 --> A2[effect: removeTagFromTasks]
        A2 --> E2[task.reducer]
        E2 --> A3[effect: cleanTaskRepeatCfgs]
        A3 --> E3[taskRepeatCfg.reducer]

        Note1["Each action = separate operation<br/>Sync may deliver partially<br/>→ Inconsistent state"]
    end

    subgraph Solution["✅ Meta-Reducer Pattern (Atomic)"]
        direction TB
        B1[deleteTag action] --> M1[tagSharedMetaReducer]
        M1 --> M2["All changes in one pass:<br/>• tasks updated<br/>• repeatCfgs cleaned<br/>• tag deleted"]
        M2 --> R1[Single reduced state]

        Note2["One action = one operation<br/>All changes sync together<br/>→ Consistent state"]
    end

    style Problem fill:#ffebee,stroke:#c62828,stroke-width:2px
    style Solution fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## 8. Archive Operations & Side Effects ✅ IMPLEMENTED

This section documents how archive-related side effects are handled, establishing the general rule that **effects should never run for remote operations**.

### 8.1 The General Rule: Effects Only for Local Actions

```mermaid
flowchart TD
    subgraph Rule["🔒 GENERAL RULE"]
        R1["All NgRx effects MUST use LOCAL_ACTIONS"]
        R2["Effects should NEVER run for remote operations"]
        R3["Side effects for remote ops are handled<br/>explicitly by OperationApplierService"]
    end

    subgraph Why["Why This Matters"]
        W1["• Prevents duplicate side effects"]
        W2["• Makes sync behavior predictable"]
        W3["• Side effects happen exactly once<br/>(on originating client)"]
        W4["• Receiving clients only update state"]
    end

    Rule --> Why

    style Rule fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
    style Why fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### 8.2 Dual-Database Architecture

Super Productivity uses **two separate IndexedDB databases** for persistence:

```mermaid
flowchart TB
    subgraph Browser["Browser IndexedDB"]
        subgraph SUPOPS["SUP_OPS Database (Operation Log)"]
            direction TB
            OpsTable["ops table<br/>━━━━━━━━━━━━━━━<br/>Operation event log<br/>UUIDv7, vectorClock, payload"]
            StateCache["state_cache table<br/>━━━━━━━━━━━━━━━<br/>NgRx state snapshots<br/>for fast hydration"]
        end

        subgraph PFAPI["PFAPI Database (Legacy + Archive)"]
            direction TB
            ArchiveYoung["archiveYoung<br/>━━━━━━━━━━━━━━━<br/>Recent archived tasks<br/>less than 21 days old"]
            ArchiveOld["archiveOld<br/>━━━━━━━━━━━━━━━<br/>Older archived tasks<br/>flushed every ~14 days"]
            TimeTracking["Time Tracking Data<br/>━━━━━━━━━━━━━━━<br/>timeSpentOnDay entries<br/>stored with tasks"]
            MetaModel["META_MODEL<br/>━━━━━━━━━━━━━━━<br/>Vector clocks for<br/>legacy sync providers"]
            OtherModels["Other Models<br/>━━━━━━━━━━━━━━━<br/>globalConfig, etc.<br/>legacy storage"]
        end
    end

    subgraph Writers["What Writes Where"]
        OpLog["OperationLogStoreService"] -->|ops, snapshots| SUPOPS
        Archive["ArchiveService<br/>ArchiveOperationHandler"] -->|tasks, time data| PFAPI
        Legacy["VectorClockFacadeService"] -->|vector clocks| MetaModel
    end

    style SUPOPS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style PFAPI fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Writers fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

**Key Points:**

| Database  | Purpose                                           | Written By                                                  |
| --------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `SUP_OPS` | Operation log (event sourcing)                    | `OperationLogStoreService`                                  |
| `PFAPI`   | Archive data, time tracking, legacy sync metadata | `ArchiveService`, `ArchiveOperationHandler`, `PfapiService` |

### 8.3 Archive Operations Flow

Archive data is stored in PFAPI's IndexedDB, **not** in NgRx state or the operation log. This requires special handling through a **unified** `ArchiveOperationHandler`:

- **Local operations**: `ArchiveOperationHandlerEffects` routes through `ArchiveOperationHandler` (using LOCAL_ACTIONS)
- **Remote operations**: `OperationApplierService` calls `ArchiveOperationHandler` directly after dispatch

Both paths use the same handler to ensure consistent behavior.

```mermaid
flowchart TD
    subgraph LocalOp["LOCAL Operation (User Action)"]
        L1[User archives tasks] --> L2["ArchiveService writes<br/>to PFAPI IndexedDB<br/>BEFORE dispatch"]
        L2 --> L3[Dispatch moveToArchive]
        L3 --> L4[Meta-reducers update NgRx state]
        L4 --> L5[ArchiveOperationHandlerEffects<br/>via LOCAL_ACTIONS]
        L5 --> L6["ArchiveOperationHandler<br/>.handleOperation<br/>(skips - already written)"]
        L4 --> L7[OperationLogEffects<br/>creates operation in SUP_OPS]
    end

    subgraph RemoteOp["REMOTE Operation (Sync)"]
        R1[Download operation<br/>from SUP_OPS sync] --> R2[OperationApplierService<br/>dispatches action]
        R2 --> R3[Meta-reducers update NgRx state]
        R3 --> R4["ArchiveOperationHandler<br/>.handleOperation"]
        R4 --> R5["Write to PFAPI IndexedDB<br/>(archiveYoung/archiveOld)"]

        NoEffect["❌ Regular effects DON'T run<br/>(action has meta.isRemote=true)"]
    end

    subgraph Storage["Storage Layer"]
        PFAPI_DB[("PFAPI IndexedDB<br/>archiveYoung<br/>archiveOld")]
        SUPOPS_DB[("SUP_OPS IndexedDB<br/>ops table")]
    end

    L2 --> PFAPI_DB
    L7 --> SUPOPS_DB
    R5 --> PFAPI_DB
    SUPOPS_DB -.->|"Sync downloads ops"| R1

    style LocalOp fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style RemoteOp fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style NoEffect fill:#ffebee,stroke:#c62828,stroke-width:2px
    style PFAPI_DB fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style SUPOPS_DB fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

### 8.4 ArchiveOperationHandler Integration

The `OperationApplierService` uses a **fail-fast** approach: if hard dependencies are missing, it throws `SyncStateCorruptedError` rather than attempting complex retry logic. This triggers a full re-sync, which is safer than partial recovery.

```mermaid
flowchart TD
    subgraph OperationApplierService["OperationApplierService (Fail-Fast)"]
        OA1[Receive operation] --> OA2{Check hard<br/>dependencies}
        OA2 -->|Missing| OA_ERR["throw SyncStateCorruptedError<br/>(triggers full re-sync)"]
        OA2 -->|OK| OA3[convertOpToAction]
        OA3 --> OA4["store.dispatch(action)<br/>with meta.isRemote=true"]
        OA4 --> OA5["archiveOperationHandler<br/>.handleOperation(action)"]
    end

    subgraph Handler["ArchiveOperationHandler"]
        H1{Action Type?}
        H1 -->|moveToArchive| H2[Write tasks to<br/>archiveYoung<br/>REMOTE ONLY]
        H1 -->|restoreTask| H3[Delete task from<br/>archive]
        H1 -->|flushYoungToOld| H4[Move old tasks<br/>Young → Old]
        H1 -->|deleteProject| H5[Remove tasks<br/>for project +<br/>cleanup time tracking]
        H1 -->|deleteTag/deleteTags| H6[Remove tag<br/>from tasks +<br/>cleanup time tracking]
        H1 -->|deleteTaskRepeatCfg| H7[Remove repeatCfgId<br/>from tasks]
        H1 -->|deleteIssueProvider| H8[Unlink issue data<br/>from tasks]
        H1 -->|deleteIssueProviders| H8b[Unlink multiple<br/>issue providers]
        H1 -->|other| H9[No-op]
    end

    OA5 --> H1

    style OperationApplierService fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Handler fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style OA_ERR fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

**Why Fail-Fast?**

The server guarantees operations arrive in sequence order, and delete operations are atomic via meta-reducers. If dependencies are missing, something is fundamentally wrong with sync state. A full re-sync is safer than attempting partial recovery with potential inconsistencies.

### 8.5 Archive Operations Summary

| Operation              | Local Handling                                                         | Remote Handling                                              |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `moveToArchive`        | ArchiveService writes BEFORE dispatch; handler skips (no double-write) | ArchiveOperationHandler writes AFTER dispatch                |
| `restoreTask`          | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler removes from archive                 |
| `flushYoungToOld`      | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler executes flush                       |
| `deleteProject`        | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler removes tasks + cleans time tracking |
| `deleteTag/deleteTags` | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler removes tags + cleans time tracking  |
| `deleteTaskRepeatCfg`  | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler removes repeatCfgId from tasks       |
| `deleteIssueProvider`  | ArchiveOperationHandlerEffects → ArchiveOperationHandler               | ArchiveOperationHandler unlinks issue data                   |

### 8.6 Key Files

| File                                              | Purpose                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `processing/archive-operation-handler.service.ts` | **Unified** handler for all archive side effects (local AND remote) |
| `processing/archive-operation-handler.effects.ts` | Routes local actions to ArchiveOperationHandler via LOCAL_ACTIONS   |
| `processing/operation-applier.service.ts`         | Calls ArchiveOperationHandler after dispatching remote operations   |
| `features/time-tracking/archive.service.ts`       | Local archive write logic (moveToArchive writes BEFORE dispatch)    |
| `features/time-tracking/task-archive.service.ts`  | Archive CRUD operations                                             |
