# Operation Log Documentation

**Last Updated:** December 2025

This directory contains the architectural documentation for Super Productivity's Operation Log system - an event-sourced persistence and synchronization layer.

## Quick Start

| If you want to...                   | Read this                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Understand the overall architecture | [operation-log-architecture.md](./operation-log-architecture.md)                   |
| See visual diagrams                 | [operation-log-architecture-diagrams.md](./operation-log-architecture-diagrams.md) |
| Learn the design rules              | [operation-rules.md](./operation-rules.md)                                         |
| Understand file-based sync          | [hybrid-manifest-architecture.md](./hybrid-manifest-architecture.md)               |
| Understand legacy PFAPI sync        | [pfapi-sync-persistence-architecture.md](./pfapi-sync-persistence-architecture.md) |

## Documentation Overview

### Core Documentation

| Document                                                                           | Description                                                                                                                                                                            | Status    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [operation-log-architecture.md](./operation-log-architecture.md)                   | Comprehensive architecture reference covering Parts A-F: Local Persistence, Legacy Sync Bridge, Server Sync, Validation & Repair, Smart Archive Handling, and Atomic State Consistency | ✅ Active |
| [operation-log-architecture-diagrams.md](./operation-log-architecture-diagrams.md) | Mermaid diagrams visualizing data flows, sync protocols, and state management                                                                                                          | ✅ Active |
| [operation-rules.md](./operation-rules.md)                                         | Design rules and guidelines for the operation log store and operations                                                                                                                 | ✅ Active |

### Sync Architecture

| Document                                                                           | Description                                                                                  | Status         |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| [hybrid-manifest-architecture.md](./hybrid-manifest-architecture.md)               | File-based sync optimization using embedded operations buffer and snapshots (WebDAV/Dropbox) | ✅ Implemented |
| [pfapi-sync-persistence-architecture.md](./pfapi-sync-persistence-architecture.md) | Legacy PFAPI sync system that coexists with operation log                                    | ✅ Active      |

### Planning & Proposals

| Document                                                                                       | Description                                   | Status        |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------- |
| [e2e-encryption-plan.md](./e2e-encryption-plan.md)                                             | End-to-end encryption design proposal         | 📋 Planned    |
| [tiered-archive-proposal.md](./tiered-archive-proposal.md)                                     | Multi-tier archive storage proposal           | 📋 Planned    |
| [operation-payload-optimization-discussion.md](./operation-payload-optimization-discussion.md) | Discussion on payload optimization strategies | 📋 Historical |

## Architecture at a Glance

The Operation Log system serves four distinct purposes:

```
┌────────────────────────────────────────────────────────────────────┐
│                        User Action                                  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                         NgRx Store
                   (Runtime Source of Truth)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   │                   ▼
    OpLogEffects              │             Other Effects
          │                   │
          ├──► SUP_OPS ◄──────┘
          │    (Local Persistence - Part A)
          │
          └──► META_MODEL vector clock
               (Legacy Sync Bridge - Part B)

          PFAPI reads from NgRx for sync (not from op-log)
```

### The Four Parts

| Part                       | Purpose                     | Description                                                                   |
| -------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| **A. Local Persistence**   | Fast writes, crash recovery | Operations stored in IndexedDB (`SUP_OPS`), with snapshots for fast hydration |
| **B. Legacy Sync Bridge**  | PFAPI compatibility         | Updates vector clocks so WebDAV/Dropbox sync continues to work                |
| **C. Server Sync**         | Operation-based sync        | Upload/download individual operations via SuperSync server                    |
| **D. Validation & Repair** | Data integrity              | Checkpoint validation with automatic repair and REPAIR operations             |

Additional architectural patterns:

| Pattern                         | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| **E. Smart Archive Handling**   | Deterministic archive operations synced via instructions, not data |
| **F. Atomic State Consistency** | Meta-reducers ensure multi-entity changes are atomic               |

## Key Concepts

### Event Sourcing

The Operation Log treats the database as a **timeline of events** rather than mutable state:

- **Source of Truth**: The log is truth; current state is derived by replaying the log
- **Immutability**: Operations are never modified, only appended
- **Snapshots**: Periodic snapshots speed up hydration (replay from snapshot + tail ops)

### Vector Clocks

Vector clocks track causality for conflict detection:

- Each client has its own counter in the vector clock
- Comparison reveals: `EQUAL`, `LESS_THAN`, `GREATER_THAN`, or `CONCURRENT`
- `CONCURRENT` indicates a true conflict requiring resolution

### LOCAL_ACTIONS Token

Effects that perform side effects (snacks, external APIs, UI) must use `LOCAL_ACTIONS` instead of `Actions`:

```typescript
private _actions$ = inject(LOCAL_ACTIONS); // Excludes remote operations
```

This prevents duplicate side effects when syncing operations from other clients.

## Related Documentation

| Location                                                               | Content                             |
| ---------------------------------------------------------------------- | ----------------------------------- |
| [/docs/sync/vector-clocks.md](/docs/sync-and-op-log/vector-clocks.md)  | Vector clock implementation details |
| [/docs/ai/sync/](/android/sync/)                                       | Historical planning documents       |
| [/packages/super-sync-server/](/packages/super-sync-server/)           | SuperSync server implementation     |
| [/src/app/pfapi/api/sync/README.md](/src/app/pfapi/api/sync/README.md) | PFAPI sync overview                 |

## Implementation Status

| Component                    | Status                                              |
| ---------------------------- | --------------------------------------------------- |
| Local Persistence (Part A)   | ✅ Complete                                         |
| Legacy Sync Bridge (Part B)  | ✅ Complete                                         |
| Server Sync (Part C)         | ✅ Complete (single-version)                        |
| Validation & Repair (Part D) | ✅ Complete                                         |
| Cross-version Sync (A.7.11)  | ⚠️ Not implemented                                  |
| Schema Migrations            | ✅ Infrastructure ready (no migrations defined yet) |

See [operation-log-architecture.md#implementation-status](./operation-log-architecture.md#implementation-status) for detailed status.
