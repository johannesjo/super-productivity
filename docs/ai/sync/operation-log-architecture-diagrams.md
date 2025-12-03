# Operation Log: Architecture Diagrams

## 1. Operation Log Architecture (Local Persistence & Legacy Bridge)

This diagram illustrates how user actions flow through the system, how they are persisted to IndexedDB (`SUP_OPS`), how the system hydrates on startup, and how it bridges to the legacy PFAPI system.

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

        Transform -->|2. Validate| PayloadValid{"Payload<br/>Valid?<br/><sub>validate-operation-payload.ts</sub>"}
        PayloadValid -- No --> ErrorSnack[Show Error Snackbar]
        PayloadValid -- Yes --> DBWrite
    end

    subgraph "Persistence Layer (IndexedDB)"
        DBWrite["Write to SUP_OPS<br/><sub>operation-log-store.service.ts</sub>"]:::storage

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
        CompactionTrig -->|Yes| Compactor["CompactionService<br/><sub>operation-log-compaction.service.ts</sub>"]:::process
        Compactor -->|Read State| NgRx
        Compactor -->|Save Snapshot| StateCache
        Compactor -->|Delete Old Ops| OpsTable
    end

    subgraph "Read Path (Hydration)"
        Startup((App Startup)) --> Hydrator["OperationLogHydrator<br/><sub>operation-log-hydrator.service.ts</sub>"]:::process
        Hydrator -->|1. Load| StateCache

        StateCache -->|Check| Schema{"Schema<br/>Version?<br/><sub>schema-migration.service.ts</sub>"}
        Schema -- Old --> Migrator["SchemaMigrationService<br/><sub>schema-migration.service.ts</sub>"]:::process
        Migrator -->|Transform State| MigratedState
        Schema -- Current --> CurrentState

        CurrentState -->|Load State| StoreInit[Init NgRx State]
        MigratedState -->|Load State| StoreInit

        Hydrator -->|2. Load Tail| OpsTable
        OpsTable -->|Replay Ops| Replayer["OperationApplier<br/><sub>operation-applier.service.ts</sub>"]:::process
        Replayer -->|Dispatch| NgRx
    end

    subgraph "Multi-Tab"
        DBWrite -->|4. Broadcast| BC["BroadcastChannel<br/><sub>multi-tab-coordinator.service.ts</sub>"]
        BC -->|Notify| OtherTabs((Other Tabs))
    end

    class OpsTable,StateCache storage;
    class LegacyMeta,LegacySync,noteLegacy legacy;
```

## 2. Operation Log Sync Architecture (Server Sync)

This diagram details the flow for syncing individual operations with a server (`Part C`), including conflict detection, resolution strategies, and the validation loop (`Part D`).

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
        Scheduler((Scheduler)) -->|Interval| SyncService["OperationLogSyncService<br/><sub>operation-log-sync.service.ts</sub>"]

        SyncService -->|1. Get Last Seq| LocalMeta["Sync Metadata<br/><sub>operation-log-store.service.ts</sub>"]

        %% Download Flow
        SyncService -->|2. Download Ops| API
        API -->|Return Ops > Seq| DownOps[Downloaded Operations]

        DownOps --> FilterApplied{Already<br/>Applied?}
        FilterApplied -- Yes --> Discard[Discard]
        FilterApplied -- No --> ConflictDet
    end

    subgraph "Client: Conflict Management"
        ConflictDet{"Conflict<br/>Detection<br/><sub>conflict-resolution.service.ts</sub>"}:::conflict

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

        Store -->|Post-Apply| Validator{"Validate<br/>State?<br/><sub>validate-state.service.ts</sub>"}:::repair

        Validator -- Valid --> Done((Sync Done))
        Validator -- Invalid --> Repair["Auto-Repair Service<br/><sub>repair-operation.service.ts</sub>"]:::repair

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

### 4.2 Receiver-Side Sync Migration

Demonstrates how a client on V2 handles incoming data from a client still on V1.

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

## 5. Hybrid Manifest (File-Based Sync)

This diagram illustrates the "Hybrid Manifest" optimization (`hybrid-manifest-architecture.md`) which reduces HTTP request overhead for WebDAV/Dropbox sync by buffering small operations directly inside the manifest file.

```mermaid
graph TD
    %% Nodes
    subgraph "Hybrid Manifest File (JSON)"
        ManVer[Version: 2]:::file
        SnapRef[Last Snapshot: 'snap_123.json']:::file
        Buffer[Embedded Ops (Buffer)<br/>[Op1, Op2, ...]]:::buffer
        ExtFiles[External Files List<br/>['ops_A.json', ...]]:::file
    end

    subgraph "Sync Logic (Upload Path)"
        Start((Start Sync)) --> ReadMan[Download Manifest]
        ReadMan --> CheckSize{Buffer Full?<br/>(> 50 ops)}

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

## 6. Hybrid Manifest Conceptual Map

This mindmap breaks down the core concepts, structure, and decision flows of the Hybrid Manifest architecture, highlighting the "Buffer vs. Overflow" strategy.

```mermaid
mindmap
  root((Hybrid Manifest<br/>Architecture))
    Concept
      Buffer System
        Small ops stay in Manifest
        Reduces file count
      Overflow System
        Full buffer dumps to file
        Keeps manifest light
    Structure
      Version Tag
      Last Snapshot Reference
        Base state file
      Embedded Operations
        The "Hot" Buffer
        List of recent Op objects
      Operation Files List
        The "Cold" History
        List of filenames
    Write Path
      1. Download Manifest
      2. Check Buffer Size
        Under Threshold
          Append to Embedded
          Upload Manifest
          **1 Write / 0 New Files**
        Over Threshold
          Move Embedded to new File
          Add File to List
          Put New Ops in Embedded
          Upload Manifest
          **1 Write / 1 New File**
    Read Path
      1. Download Manifest
      2. Load Snapshot
        If newer than local
      3. Load External Files
        Only unseen files
      4. Apply Embedded Ops
        Most recent changes
    Compaction
      Trigger
        File count > 50
        Total ops > 5000
      Process
        Generate Snapshot
        Clear External Files List
        Clear Embedded Ops
        Update Manifest
```
