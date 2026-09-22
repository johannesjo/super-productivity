# Headless client handover

**Status (2026-09-22):** direction decided, nothing built. Use this document to
start a fresh session. It records what was decided, why, what already exists,
and the order to build in. Verify every path below before relying on it; the
tree moves.

## Decision

Assistants reach Super Productivity through a **headless client that runs on a
server the user controls**. It is a full sync device: it holds the sync
passphrase, downloads and replays operations with the app's own reducers,
enforces policy per credential, exposes a small MCP tool set, and writes
ordinary encrypted operations under its own client id. The SuperSync server
never sees plaintext and never learns about agents.

This is the architecture in
[`2026-09-16-work-api-mcp-and-headless-device.md`](2026-09-16-work-api-mcp-and-headless-device.md)
(principle 6, Phase 4, and the "Server-side MCP in SuperSync" non-goal). Read
that plan first; this handover only sequences it.

The branch `feat/task-1-7236d7` built something else: a keyless capture queue on
the sync server, published by the user's app on its next sync. It is set aside,
not merged. See "What to reuse from the set-aside branch" below and the note at
the top of
[`2026-09-17-agent-capture-stage-a.md`](2026-09-17-agent-capture-stage-a.md).

Why the headless client wins for a self-hosted, single-user deployment:

- Privacy holds end to end. The capture queue required plaintext on the server.
- It can read, not only capture. Community MCP servers show users want both.
- No new sync protocol. A capture is an `addTask` op from another device, so the
  server, the wire format, and the restore tooling stay untouched.

Known costs, accepted for self-hosting and open for a hosted offer:

- The process holds the key and full decrypted state behind a network endpoint.
- It must replay with reducers that match the apps, so it is versioned with them.
- Passphrase change, encryption toggle, or sync wipe means re-pairing.
- Hosted variant means the operator holds user keys. Decide only on demand.

## What already exists (verified 2026-09-22)

| Piece                                                              | Where                                                      | Note                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 35 reducers plus task-shared meta-reducers, none import `@angular` | `src/app/**/*.reducer.ts`, `src/app/root-store/meta/`      | Only `meta-reducer-registry.ts` touches Angular                                            |
| Encryption, replay and planning helpers, port contracts            | `packages/sync-core/src/index.ts`                          | `encrypt`/`decrypt`, `applyRemoteOperations`, `ActionDispatchPort`, `OperationApplyPort`   |
| SuperSync HTTP client with a fetch factory                         | `packages/sync-providers/`                                 |                                                                                            |
| Local REST API, Electron only, off by default                      | `electron/local-rest-api.ts`, wiki `docs/wiki/3.01-API.md` | Routes under `/tasks`, `/projects`, `/tags`, token auth; `IS_ELECTRON` gates it in the app |
| Plugin bridge (2350 lines, grandfathered)                          | `src/app/plugins/plugin-bridge.service.ts`                 | `addTask`, `updateTask`, `getTasks`, `dispatchAction` allowlist                            |
| Electron under xvfb in CI                                          | `.github/workflows/electron-smoke.yml`                     | Proves a headless Electron run is possible                                                 |
| Web build in headless Chromium                                     | `e2e/`, `playwright.config.ts` (port 4242)                 | Web build has no REST API                                                                  |
| Op-log persistence (browser)                                       | `src/app/op-log/persistence/`                              | IndexedDB; a Node client needs its own store                                               |
| Sync package roadmap                                               | `docs/long-term-plans/sync-core-simplification-roadmap.md` | Reducer extraction must be sequenced with it                                               |

## Build order

Each step is usable on its own and each has a check. Do not start the next
step before the check passes.

### Step 0 — Run the existing app headless (spike, no product code)

Goal: prove that a container can be a sync device today, before extracting
anything.

- Package the Electron app with xvfb in a container next to `super-sync-server`
  (the smoke workflow shows the apt packages needed). Configure SuperSync and
  the passphrase through the app once, using a VNC or a one-off copy of the
  app's data directory.
- Enable the local REST API on `3876` inside the container. Do not expose it
  beyond the container network.
- Verify: `curl` a `POST /tasks` inside the container, then confirm the task
  appears on your phone through ordinary sync, encrypted on the server.
- Record what broke: startup without a display, day boundary and timezone,
  memory after a day, behaviour after the app auto-updates.

Fallback if Electron in a container is too heavy: the web build in headless
Chromium driven over CDP, the way `e2e/` does it. It has no REST API, so the
adapter would call into `window` like the E2E harness. Treat that as a last
resort; it couples the adapter to app internals.

### Step 1 — MCP adapter with one tool

Goal: an assistant creates a task through the container.

- A small Node process in the same container, `packages/sp-mcp/` or similar,
  that speaks streamable HTTP MCP (`initialize`, `tools/list`, `tools/call`,
  `ping`) and forwards to the REST API. The 09-16 plan implements the subset
  in-repo to honour the no-new-root-dependency rule; a dependency inside the
  package is acceptable if it stays there.
- One tool: `create_task(title, notes?)` into the Inbox. The tool description
  says the task exists once the call returns, because it does.
- Auth: one bearer credential per connection, minted by hand for now. Rate limit
  and body-size cap in the adapter.
- Expose over HTTPS behind your reverse proxy. Claude remote connectors call
  from Anthropic infrastructure, so the endpoint is public; the credential is the
  only gate.
- Verify: a Claude remote connector creates a task from the phone with the
  laptop asleep. The op on the server is encrypted and carries the container's
  client id.

### Step 2 — Policy and attribution

Goal: make read access safe before granting it.

- Policy per credential, checked in the adapter on every call: preset
  `read-only` (today, scheduled, open; titles and metadata only), `assist`,
  `full`, as in the 09-16 plan §6. Never expose sync credentials, provider
  tokens, or global config, not even under `full`.
- Add read tools in the order users ask for them: `get_today_context`,
  `list_tasks`, `get_task`, `list_projects`, `list_tags`.
- Attribution: the container's client id is already on every op. Add "undo
  everything this device did today" as a compensating batch built from the op
  log filtered by that client id, before any write tool beyond `create_task`.
- Audit log in the container: tool name, entity ids, timestamp. Never task text
  (sync rule 9).
- Verify: a spec per preset asserting its allow and deny lists; the audit log
  contains no title or notes after a full tool run.

### Step 3 — Replace the app with a Node client

Goal: drop Electron and xvfb once the workflow has proven itself.

- `packages/headless-client/`: compose `@sp/sync-core`, `@sp/sync-providers`,
  the reducers, a Node op-log store, and the adapter from Step 1.
- Reducer access: first a dedicated build entry that bundles the reducer files
  from `src/app` for Node, then a physical move once stable. Sequence with the
  sync simplification roadmap so the two efforts do not cross.
- Pairing: the app mints a device credential and shows a short code; the
  container starts with it. Pairing also captures the timezone; the day offset
  comes from synced global config. Never use the container's clock settings.
- Verify: the E2E two-device suite with the Node client as one device; a
  BACKUP_IMPORT on the phone leaves the Node client consistent; a passphrase
  change surfaces "needs re-pairing" in the app.

### Step 4 — Product integration

Settings section "AI assistants" with connection cards, presets, revoke, and a
"Forget device" that revokes the container. Translated copy and wiki pages.
Only after Step 2 has real use.

## What to reuse from the set-aside branch

`feat/task-1-7236d7` stays unmerged as a reference. Worth cherry-picking when
needed, nothing else:

- `prepareMainTaskAdd()` extracted from `TaskService.add()` so a task can be
  built without dispatching. Useful for the Node client in Step 3.
- The optional `captureId` attribution field on operations, if per-agent undo
  needs more than the client id. Check `docs/feature-review-guide.md` § long-term
  cost before adding any field to the wire format.
- `findCapturePreparationBlocker()` in
  `src/app/op-log/sync/capture-preparation-clock.ts` as a checklist of the
  states in which a device must not write: incomplete rebuild, unapplied or
  failed remote ops, un-uploaded local full-state replacement.
- The retry-probe evidence in the Stage A validation record: assistants do not
  reuse submission ids unprompted, so idempotency must come from the server side
  of the tool, not from the model.

Do not reuse the server routes, Prisma tables, publication service, restore
hold, operator CLI, or the client delivery loop. They exist only because the
endpoint had no key.

## Repo rules that bite here

- No new packages in the root `dependencies` or `devDependencies`. Dependencies
  inside a new workspace package are acceptable if isolated.
- `IS_ELECTRON` before any Electron API; the web build has no REST API.
- Effects inject `LOCAL_ACTIONS`; a Node client replaying remote ops must not
  re-trigger effects (contributor sync model, rules 1 to 3).
- Logical day through `DateService` semantics; reducers take
  `startOfNextDayDiffMs`.
- Never log task content. Audit logs hold ids only.
- No schema bump. Everything ships as additive, optional data or unsynced device
  state.
- Every change to sync starts from a reproducible failure. The two-device E2E
  suite is the harness; add the Node client as a device there.
- Service size cap 1200 lines; the plugin bridge is grandfathered and may only
  shrink.

## Open decisions

1. Electron-in-container versus web-build-in-Chromium for Step 0. Default:
   Electron, because the REST API exists there.
2. In-repo MCP subset versus the official SDK inside `packages/sp-mcp/`.
3. Where the reducer bundle lives during Step 3 and how it stays in lockstep with
   app releases. Proposal: the headless image is built from the same tag as the
   app and refuses to start against a newer schema.
4. Hosted offer: defer until self-hosters ask. If offered, describe it as "a
   device we run for you".

## Risks

- Version skew between the headless client and the apps corrupts state. Pin the
  image to the app tag and add a startup check.
- The container is a public endpoint with the key. Keep the adapter minimal, put
  it behind the reverse proxy, and rate-limit from the first commit.
- Electron in a container drifts (auto-update, display, memory). Step 0 is a
  spike precisely to find out; do not ship it as the product.
- Vector clock slot: one headless device per user in v1.

## Suggested opening prompt for the new session

> Read `docs/plans/2026-09-22-headless-client-handover.md` and
> `docs/plans/2026-09-16-work-api-mcp-and-headless-device.md`. We are doing
> Step 0: run the existing Electron app headless in a container next to
> `super-sync-server`, enable the local REST API inside the container, and prove
> a task created through it reaches another device through encrypted sync. Plan
> first, list each step with its check, then build the container.
