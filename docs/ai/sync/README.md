# Sync Documentation (AI Reference)

This directory contains research, planning, and historical documentation related to the sync system. These documents were created during the development of the Operation Log architecture.

## Canonical Documentation

For the current, authoritative documentation, see:

**[/src/app/core/persistence/operation-log/docs/](/src/app/core/persistence/operation-log/docs/)**

That directory contains:

- `operation-log-architecture.md` - Main architecture reference
- `operation-log-architecture-diagrams.md` - Visual diagrams
- `operation-rules.md` - Design rules
- `hybrid-manifest-architecture.md` - File-based sync optimization
- `pfapi-sync-persistence-architecture.md` - Legacy PFAPI sync

## Documents in This Directory

### Active/Useful

| Document                                                                       | Purpose                                         |
| ------------------------------------------------------------------------------ | ----------------------------------------------- |
| [operation-log-sync-best-practices.md](./operation-log-sync-best-practices.md) | Industry best practices for op-log sync servers |
| [operation-log-best-practises2.md](./operation-log-best-practises2.md)         | Research from Figma, Linear, Replicache         |
| [server-sync-architecture.md](./server-sync-architecture.md)                   | SuperSync server design considerations          |

### Historical (Reference Only)

These documents were created during planning and may be outdated:

| Document                                                                                 | Purpose                 | Status               |
| ---------------------------------------------------------------------------------------- | ----------------------- | -------------------- |
| [operation-log-implementation-review.md](./operation-log-implementation-review.md)       | Code review findings    | 📋 Mostly resolved   |
| [operation-log-integration-testing-plan.md](./operation-log-integration-testing-plan.md) | Test planning           | ✅ Tests implemented |
| [replace-pfapi-with-oplog-plan.md](./replace-pfapi-with-oplog-plan.md)                   | Migration planning      | ✅ Complete          |
| [supersync-e2e-test-plan.md](./supersync-e2e-test-plan.md)                               | E2E test scenarios      | ✅ Tests implemented |
| [synthesized-delta-vs-oplog.md](./synthesized-delta-vs-oplog.md)                         | Architecture comparison | 📋 Historical        |
| [synthesized-delta-sync-analysis.md](./synthesized-delta-sync-analysis.md)               | Delta sync analysis     | 📋 Historical        |

### Redirects

These documents have moved to canonical locations:

| Document                                                                           | Redirects To                                    |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| [pfapi-sync-persistence-architecture.md](./pfapi-sync-persistence-architecture.md) | `/src/app/core/persistence/operation-log/docs/` |
| [hybrid-manifest-architecture.md](./hybrid-manifest-architecture.md)               | `/src/app/core/persistence/operation-log/docs/` |

## Related Documentation

| Location                            | Content                        |
| ----------------------------------- | ------------------------------ |
| `/docs/sync/vector-clocks.md`       | Vector clock implementation    |
| `/packages/super-sync-server/`      | SuperSync server code and docs |
| `/src/app/pfapi/api/sync/README.md` | PFAPI sync overview            |
