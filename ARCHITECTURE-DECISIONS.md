# Architecture decisions

## ADR-001: Svelte 5 application shell

The Angular/NgRx frontend is replaced by SvelteKit 2 and Svelte 5. UI state uses runes while durable state changes pass through the framework-neutral domain and application packages.

## ADR-002: Tauri-only desktop runtime

Tauri 2 is the sole desktop host for macOS, Windows, and Linux. Electron and Capacitor runtimes are removed. Web remains a first-class static PWA target.

## ADR-003: One intent, one operation

Every local domain command produces exactly one immutable operation and one atomic state write. Remote operations and replay do not emit new local operations. This makes persistence, sync, conflict handling, and testing deterministic.

## ADR-004: Keep NouraSync

The NouraSync server, shared schema, encryption core, and provider packages remain compatible. Noura adds a client adapter for the existing HTTP and WebSocket contracts. Access tokens and encryption passphrases are memory-only.

## ADR-005: No runtime plugins

The plugin API, plugin host, marketplace, and plugin development workspace are removed. Supported integrations are compiled, typed first-party adapters so permissions and data flow are inspectable at build time.

## ADR-006: Compatible backup import

Noura has its own versioned domain state but accepts Super Productivity complete backups. The migrator maps supported first-party data and deliberately ignores plugin state.
