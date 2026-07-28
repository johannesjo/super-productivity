# Operation Log & Sync Documentation

The Operation Log is the **single client sync pipeline** for SuperSync and file
providers. Persistent NgRx actions update the live projection and are captured
as durable operations; restart uses a structurally screened snapshot plus the
retained operation tail. Vector clocks detect causal order and concurrent edits.

```
                    Persistent NgRx action
                     ┌────────┴────────┐
                     ▼                 ▼
               NgRx reducers     operation capture
                     │                 │
                     ▼                 ▼
            runtime projection      SUP_OPS
                                  (ops, clocks,
                               checkpoints, snapshot)
                                           │
                                           ▼
                                    Sync Providers
                       ┌───────────────────┴──────────────────┐
                       ▼                                      ▼
                   SuperSync                       File providers
               (ordered op API)           (shared v2 or v3 envelopes)
```

The v2/v3 envelopes are common adapter formats, not a common physical write
guarantee. Dropbox and OneDrive can enforce API compare-and-swap (CAS), while
WebDAV/Nextcloud is atomic only when the server supplies strong ETags; weak or
missing ETags fall back to a best-effort check. LocalFile likewise has a
best-effort read/check/write race and is single-writer/backup-only.

## Start here

| You want to…                                           | Read                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build a five-minute whole-system mental model          | **[sync-architecture.html](./sync-architecture.html)** — standalone maintainer field guide; open the local file in a browser                        |
| Write an effect/reducer/bulk-dispatch correctly        | **[contributor-sync-model.md](./contributor-sync-model.md)** — the one invariant, enforced by lint                                                  |
| Compare SuperSync and file v2/v3                       | [field guide: transports](./sync-architecture.html#transport)                                                                                       |
| Trace remote apply, conflicts, or restart recovery     | [remote apply](./sync-architecture.html#remote-apply), [causality](./sync-architecture.html#causality), [restart](./sync-architecture.html#restart) |
| Research rejected alternatives or cross-version policy | [operation-log-architecture.md](./operation-log-architecture.md) — deep rationale and migration reference                                           |

## Reference docs

| Document                                                                       | Scope                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [sync-architecture.html](./sync-architecture.html)                             | Canonical high-level maintainer map: local intent, transports, crash-safe apply, causality, exceptional boundaries, restart recovery, and executable owners |
| [operation-log-architecture.md](./operation-log-architecture.md)               | Deep rationale and migration/implementation history; use the focused contracts and executable owners for current detail                                     |
| [contributor-sync-model.md](./contributor-sync-model.md)                       | Contributor invariant: one replay-atomic transition = one op; replayed/remote ops must not re-trigger effects                                               |
| [operation-rules.md](./operation-rules.md)                                     | Design rules and guidelines for operations                                                                                                                  |
| [package-boundaries.md](./package-boundaries.md)                               | Dependency/ownership boundaries for `@sp/sync-core`, `@sp/sync-providers`, app wiring                                                                       |
| [conflict-journal-and-review.md](./conflict-journal-and-review.md)             | Disjoint-field auto-merge plus the device-local journal/review capability; main remote-path journal emission is currently disabled                          |
| [vector-clocks.md](./vector-clocks.md)                                         | Vector clock implementation, pruning, history                                                                                                               |
| [supersync-encryption-architecture.md](./supersync-encryption-architecture.md) | End-to-end encryption (AES-256-GCM + Argon2id)                                                                                                              |

## Scenario catalogs (expected behavior)

| Document                                           | Scope                                                           |
| -------------------------------------------------- | --------------------------------------------------------------- |
| [supersync-scenarios.md](./supersync-scenarios.md) | Maintained catalog of SuperSync scenarios and expected behavior |

## Related

| Location                                                                                                 | Content                                      |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [packages/super-sync-server/docs/architecture.md](../../packages/super-sync-server/docs/architecture.md) | SuperSync server-only architecture reference |
| [packages/super-sync-server/](../../packages/super-sync-server/)                                         | SuperSync server implementation              |
| [ARCHITECTURE-DECISIONS.md](../../ARCHITECTURE-DECISIONS.md)                                             | Load-bearing product/data decisions          |

> Obsolete duplicated walkthroughs and superseded plans live only in git
> history. Load-bearing ADRs and the explicitly owned migration/rationale
> sections listed above remain maintained documentation.
