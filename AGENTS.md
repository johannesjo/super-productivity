# Noura agent guide

Noura is a SvelteKit 2, Svelte 5, Bun, and Tauri 2 application derived from Super Productivity. The SuperSync server and shared sync packages are retained; Angular, NgRx, Electron, Capacitor, and the runtime plugin platform are not part of the production graph.

## Required Svelte workflow

For every `.svelte`, `.svelte.ts`, or `.svelte.js` task:

1. Use the official Svelte MCP documentation tools for framework behavior.
2. Run the official Svelte autofixer on every changed Svelte file.
3. Apply its fixes and rerun it until there are no issues or suggestions.
4. Use Svelte 5 runes and event attributes; do not introduce legacy component syntax.

The domain and application packages are the durable system of record. Components may hold ephemeral view state only.

## Commands

Use Bun for all workspace operations:

```sh
bun install
bun run dev
bun run check
bun run lint
bun run test
bun run test:client
bun run test:e2e
bun run build
bun run tauri:dev
bun run tauri:build
```

Use `bunx --bun shadcn-svelte@latest` for component commands. Read `apps/client/components.json` and existing component barrels first. The installed shadcn-svelte repository skill is in `.agents/skills/shadcn-svelte`.

## Architecture rules

- One user intent produces one persisted domain operation.
- Replayed and remote operations must never create another local operation.
- Product state changes go through `DomainStore`; keep reducers deterministic and immutable.
- Never persist SuperSync access tokens or encryption passphrases.
- Do not log task titles, notes, credentials, or other user content.
- Integrations are compiled first-party adapters, never dynamically loaded code.
- Keep the app fully usable offline; network services are optional layers.
- No analytics, telemetry, streaks, or attention-grabbing defaults.
- Use strict TypeScript and `unknown` instead of `any`.

## Verification

Add unit coverage for domain, persistence, sync, and integration behavior. Add Playwright coverage for user workflows. Task-list changes must be checked against the 10,000-task performance fixture. Tauri capability changes require `cargo check` and a desktop build.

Read `ARCHITECTURE-DECISIONS.md`, `PRODUCT.md`, `DESIGN.md`, and `docs/architecture.md` before changing boundaries or product scope.
