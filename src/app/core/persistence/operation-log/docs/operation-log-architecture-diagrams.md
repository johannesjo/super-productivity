# Operation Log: Architecture Diagrams

**Last Updated:** December 5, 2025

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

    subgraph "Persistence Layer (IndexedDB)"
        DBWrite["Write to SUP_OPS<br/><sub>store/operation-log-store.service.ts</sub>"]:::storage

        DBWrite -->|Append| OpsTable["Table: ops<br/>The Event Log<br/><sub>IndexedDB</sub>"]:::storage
        DBWrite -->|Update| StateCache["Table: state_cache<br/>Snapshots<br/><sub>IndexedDB</sub>"]:::storage
    end

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

    subgraph "Multi-Tab"
        DBWrite -->|4. Broadcast| BC["BroadcastChannel<br/><sub>sync/multi-tab-coordinator.service.ts</sub>"]
        BC -->|Notify| OtherTabs((Other Tabs))
    end

    class OpsTable,StateCache storage;
    class LegacyMeta,LegacySync,noteLegacy legacy;
```

## 2. Operation Log Sync Architecture (Server Sync) ✅ IMPLEMENTED

This diagram details the flow for syncing individual operations with a server (`Part C`), including conflict detection, resolution strategies, and the validation loop (`Part D`).

**Implementation Status:** Complete (single-schema-version). Key services:

- `OperationLogSyncService` - Orchestration
- `OperationLogUploadService` / `OperationLogDownloadService` - Data transfer
- `ConflictResolutionService` - User resolution UI
- `VectorClockService` - Conflict detection

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
        FilterRejected -- No --> UploadBatch[Batch for Upload]

        UploadBatch -->|3. Upload| API
        API -->|Ack| ServerAck[Server Acknowledgement]
        ServerAck -->|Update| MarkSynced[Mark Ops Synced]
        MarkSynced --> OpLog
    end

    API <--> ServerDB
```

## 3. Conflict-Aware Migration Strategy (The Migration Shield)

> **Note:** Sections 3, 4.1, and 4.2 describe the **cross-version migration strategy** (A.7.11) which is designed but not yet implemented. Currently `CURRENT_SCHEMA_VERSION = 1`, so all clients are on the same version. State cache snapshots are migrated via `SchemaMigrationService.migrateIfNeeded()`. Individual operation migration will be needed when schema versions diverge between clients.

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
