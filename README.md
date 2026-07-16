# Noura

Noura is a local-first task, planning, time-tracking, and focus app. It is a Svelte 5 + Tauri 2 rewrite of Super Productivity with a compact, TickTick-inspired information architecture and an original visual identity.

The app works offline in a browser or native desktop shell. Optional end-to-end encrypted synchronization uses the retained NouraSync server. The runtime plugin platform, Angular, Electron, and Capacitor are intentionally not part of Noura.

## Stack

- SvelteKit 2 and Svelte 5
- shadcn-svelte preset `b1VozgbA` and Tailwind CSS 4
- Tauri 2 for macOS, Windows, and Linux
- Bun workspaces
- IndexedDB on the web and SQLite in Tauri
- Retained NouraSync, sync-core, sync-providers, and shared-schema packages

## Development

Requirements: Bun 1.3+, Rust stable, and the platform prerequisites from the [Tauri documentation](https://v2.tauri.app/start/prerequisites/).

```sh
bun install
bun run dev
```

Useful commands:

```sh
bun run check
bun run lint
bun run test
bun run test:e2e
bun run build
bun run tauri:dev
bun run tauri:build
```

## NouraSync

The full NouraSync server remains in `packages/noura-sync-server`. Start it locally with:

```sh
docker compose up db nourasync
```

Then open Settings → Account in Noura and enter the server URL, access token, and encryption passphrase. Credentials remain in memory; only the sync cursor and encrypted operations are persisted.

See [NouraSync self-hosting](docs/nourasync.md) for production guidance.

## Data migration

Settings → Backups imports both Noura exports and Super Productivity complete-backup JSON files. Projects, tags, tasks, archived tasks, notes, scheduling, estimates, tracked time, checklists, attachments, and issue links are retained. Runtime plugin records are ignored.

See [Migration](docs/migration.md) for the exact mapping and limitations.

## Architecture

See [Architecture](docs/architecture.md), [Product scope](PRODUCT.md), and [Design context](DESIGN.md).

## License and upstream

Noura is distributed under the [MIT License](LICENSE). It is derived from [Super Productivity](https://github.com/super-productivity/super-productivity); the retained sync packages and server preserve their upstream history and attribution.
