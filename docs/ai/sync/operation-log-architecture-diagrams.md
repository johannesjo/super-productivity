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

## 3. Conflict-Aware Migration Strategy

This mindmap outlines the strategy for handling version conflicts during sync by migrating operations before conflict detection.

```mermaid
mindmap
  root((Conflict-Aware<br/>Migration))
    Strategies
      Operation-Level Migration
        Transform V1 Op to V2 Op
        Extend SchemaMigration Interface
      Inbound Path Receive
        Intercept Remote Ops
        Check Op Schema Version
        Migrate Old Ops
        Detect Conflicts on Migrated Ops
      Outbound Path Send
        Get Unsynced Ops
        Migrate Pending Ops if Old
        Ensure Upload matches Current Schema
      Conflict Resolution
        Unified Comparison
        Local Current vs Remote Migrated
        Prevent False Conflicts
```

## 4. Hybrid Manifest & Snapshot Architecture (WebDAV / Dropbox Fallback)

This diagram illustrates the efficient "Hybrid Manifest" approach for file-based sync, showing how small operations are buffered in the manifest to reduce request counts, how overflow creates new files, and how snapshotting consolidates history.

```mermaid
graph TD
    %% Styles
    classDef local fill:#fff,stroke:#333,stroke-width:2px,color:black;
    classDef remote fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:black;
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:black;
    classDef storage fill:#f9f,stroke:#333,stroke-width:2px,color:black;

    subgraph "Client: Write Path (Hybrid)"
        StartWrite((Sync Trigger)) --> LoadMan[Download manifest.json]
        LoadMan --> CheckBuff{Buffer Full?<br/>> 50 Ops}:::decision

        %% Path A: Buffer Open
        CheckBuff -- No --> AppendBuff[Append Ops to<br/>manifest.embeddedOperations]
        AppendBuff --> WriteMan[Upload manifest.json]:::remote

        %% Path B: Buffer Full (Overflow)
        CheckBuff -- Yes --> CreateFile[Flush embeddedOperations<br/>to ops/overflow_TIMESTAMP.json]:::storage
        CreateFile --> UploadFile[Upload Op File]:::remote
        UploadFile --> ClearBuff[Clear Buffer &<br/>Add Filename to<br/>manifest.operationFiles]
        ClearBuff --> AppendBuff
    end

    subgraph "Client: Read Path"
        StartRead((Sync Start)) --> DownMan[Download manifest.json]:::remote
        DownMan --> CheckSnap{Newer<br/>Snapshot?}:::decision

        CheckSnap -- Yes --> DownSnap[Download & Apply<br/>Snapshot File]:::remote
        CheckSnap -- No --> CheckFiles

        DownSnap --> CheckFiles
        CheckFiles[Download & Apply<br/>New Op Files]:::remote
        CheckFiles --> ApplyEmb[Apply<br/>embeddedOperations]
        ApplyEmb --> Done((Sync Done))
    end

    subgraph "Client: Snapshotting (Compaction)"
        Trigger{Trigger?<br/>> 50 Files}:::decision
        Trigger -- Yes --> GenSnap[Generate Full Snapshot]:::storage
        GenSnap --> UpSnap[Upload Snapshot File]:::remote
        UpSnap --> UpManSnap[Update manifest.json:<br/>1. Set lastSnapshot<br/>2. Clear operationFiles]:::remote
        UpManSnap --> Cleanup[Delete Old Files<br/>(Async)]
    end

    class LoadMan,WriteMan,CreateFile,UploadFile,DownMan,DownSnap,CheckFiles,UpSnap,UpManSnap remote;
    class CheckBuff,CheckSnap,Trigger decision;
```
