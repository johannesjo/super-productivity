# Architecture

## Package boundaries

```text
apps/client (Svelte UI + Tauri host)
  ├─ packages/application (commands, persistence orchestration, sync adapter)
  ├─ packages/domain (types, reducer, selectors, legacy migration)
  ├─ packages/platform (web/Tauri capabilities)
  └─ packages/integrations (compiled provider registry)

packages/application
  ├─ packages/domain
  ├─ packages/sync-core
  └─ packages/shared-schema

packages/super-sync-server
  ├─ packages/sync-core
  └─ packages/shared-schema
```

The domain package is framework-free. It owns normalized tasks, projects, tags, time sessions, commands, reducers, ordering, and legacy backup conversion. The application package owns the store, atomic repository calls, operation sequencing, encrypted transport, and retained SuperSync protocol mapping.

## Persistence

The web app persists domain state and operations in a single IndexedDB transaction. Tauri uses SQLite with an explicit transaction. The UI can optimistically react because a command is not published to synchronization until persistence succeeds.

## Synchronization

`EncryptedOperationTransport` encrypts serialized domain operations with sync-core before sending them through `SuperSyncHttpEndpoint`. The endpoint maps Noura operations onto SuperSync's existing operation envelope, bearer authentication, cursor/vector-clock response, and WebSocket invalidation channel. A reconnecting WebSocket triggers pulls; polling is the fallback.

## Desktop capabilities

The Tauri host enables SQLite, filesystem/dialog, notifications, global shortcuts, autostart, deep links, HTTP, clipboard, opener, OS/process, store, shell, and updater plugins. Capabilities are restricted in `apps/client/src-tauri/capabilities`.

## Security boundaries

- User content is local by default.
- SuperSync payloads are encrypted before transport.
- Access tokens and passphrases are never stored in the domain database.
- Runtime plugins and arbitrary third-party code loading are absent.
- External integrations are explicit compiled adapters.
