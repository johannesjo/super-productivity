# Contributing to Noura

Thanks for helping improve Noura. Keep changes focused on a concrete personal-productivity workflow and preserve offline behavior, privacy, and data compatibility.

## Setup

```sh
bun install
bun run dev
```

Desktop work additionally requires Rust and the Tauri platform prerequisites.

## Before opening a pull request

```sh
bun run check
bun run lint
bun run test
bun run test:client
bun run test:e2e
bun run build
```

Run `cargo check --manifest-path apps/client/src-tauri/Cargo.toml` for Tauri changes. Every changed Svelte component/module must also pass the official Svelte autofixer described in `AGENTS.md`.

Changes to domain state or sync must preserve one intent → one persisted operation, deterministic replay, and durable remote application before advancing the sync cursor. Add migration coverage for schema changes.

Use conventional commit subjects such as `feat(client): add task filter` or `fix(sync): await remote persistence`. Explain behavior and verification in the pull request.
