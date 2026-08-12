# Parity ledger — Noura vs. upstream Super Productivity

This ledger defines "1-to-1": every Super Productivity capability, minus the
explicitly excluded set in `PRODUCT.md` (plugin platform, Brain Dump, Doc Mode,
Todoist import, Automations, AI prompts, Procrastination Buster, Voice Reminder,
Yesterday Tasks, sync.md, Electron/Capacitor/mobile, runtime plugin API).

It is **machine-checkable**: the statuses and owning files below are mirrored in
`packages/domain/src/parity/parity-registry.ts`, and
`packages/domain/src/parity/parity.spec.ts` verifies every referenced file
exists and is non-empty. `packages/domain/src/differential/` holds the fixture
harness that re-applies captured command batches and asserts the reducers still
produce the frozen reference state (ADR-003 determinism).

Legend: ✅ implemented · 🟡 partial · ❌ absent · 🔒 retained (unchanged from upstream)

## Phase 1 — Domain completeness (`packages/domain`)

| Feature | Status | Owning file | Tests |
|---|---|---|---|
| Task model (start, due+time, repeatCfg, priority 0–3, estimate, timeSpent, subtask tree, attachments, issueId/provider, order, doneOn, reminders) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Subtask tree (nested hierarchy, infinite depth) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Task sections (divisions with passing items) | ✅ | `packages/domain/src/entities.ts` | — |
| Project settings (color, icon, theme, archived, taskCfg) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Tag CRUD + color | ✅ | `packages/domain/src/reducer.ts` | `packages/domain/src/domain.spec.ts` |
| TaskRepeatCfg recurrence engine + rollover | ✅ | `packages/domain/src/recurrence.ts` | `packages/domain/src/domain.spec.ts` |
| Note entity + bookmarks/attachments | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Worklog entity (start/end/task/dates) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| SimpleCounter entity + tick/toggle | ✅ | `packages/domain/src/reducer.ts` | `packages/domain/src/domain.spec.ts` |
| WorkContext entity + switch/focus | ✅ | `packages/domain/src/reducer.ts` | `packages/domain/src/domain.spec.ts` |
| IssueProviderCfg (settings; secrets never persisted) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| GlobalConfig / UserProfile persisted settings | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| TaskViewConfig per-view customization | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Archives (young/old) + history + resets | ✅ | `packages/domain/src/reducer.ts` | `packages/domain/src/domain.spec.ts` |
| TrackedEntry (fixed start/end, manual + timer) | ✅ | `packages/domain/src/entities.ts` | `packages/domain/src/domain.spec.ts` |
| Smart list entity + evaluation | ✅ | `packages/domain/src/selectors.ts` | `packages/domain/src/domain.spec.ts` |
| Deterministic, immutable reducer (ADR-003) | ✅ | `packages/domain/src/reducer.ts` + `differential/harness.ts` | `packages/domain/src/differential/differential.spec.ts` |
| Complete SP backup → Noura migration (tasks/projects/tags/notes/work contexts/repeat cfgs/counters/smart lists/providers/config) | ✅ | `packages/domain/src/migrate.ts` | `packages/domain/src/domain.spec.ts` |
| v1 → v2 domain state migration | ✅ | `packages/domain/src/migrate.ts` | `packages/domain/src/domain.spec.ts` |

## Phase 2 — Application layer (`packages/application`, `packages/platform`, `packages/domain`)

| Feature | Status | Owning file | Tests |
|---|---|---|---|
| DomainStore (one intent → one persisted operation) | ✅ | `packages/application/src/index.ts` | `packages/application/src/store.spec.ts` |
| EncryptedOperationTransport (sync-core encryption) | ✅ | `packages/application/src/sync.ts` | `packages/application/src/sync.spec.ts` |
| NouraSync HTTP endpoint + WebSocket subscribe | ✅ | `packages/application/src/sync.ts` | — |
| File provider endpoints (WebDAV/Nextcloud/Dropbox/OneDrive/local) | ✅ | `packages/application/src/sync.ts` | — |
| Selectors package (planner buckets, smart lists, metrics, search index) | 🟡 | `packages/domain/src/selectors.ts` | `packages/domain/src/domain.spec.ts` |
| Effects/orchestration (day strategies, finish-day, completion→history) | 🟡 | `apps/client/src/lib/app/model.svelte.ts` | `apps/client/src/lib/app/model.spec.ts` |
| Services (reminders scheduler, tracking reminder, take-a-break, idle detection, global shortcuts, search index) | 🟡 | `packages/platform/src/index.ts` | — |
| Platform adapters (credentials/files/clipboard/http/notifications/tray/backup) | 🟡 | `packages/platform/src/index.ts` | — |

## Phase 3 — Shell & core task UI (TickTick target, `apps/client`)

| Feature | Status | Owning file |
|---|---|---|
| App shell (56px rail, resizable panes, sheet <1280 / overlay <960 / single <640) | ✅ | `src/lib/app/AppShell.svelte` |
| Sidebar (Today/Upcoming/Inbox/projects) | ✅ | `src/lib/app/AppShell.svelte` |
| Quick capture (due/project/status) | 🟡 | `src/lib/app/TaskCaptureDialog.svelte` |
| Task list (compact rows, checklist progress) | 🟡 | `src/lib/app/TaskWorkspace.svelte` |
| Inspector (schedule, notes, checklist, tags, repeat, attachments, tracking) | 🟡 | `src/lib/app/TaskInspector.svelte` |
| Focus view (pomodoro/flowtime/stopwatch + stats) | 🟡 | `src/lib/app/FocusView.svelte` |
| Planner month grid | 🟡 | `src/lib/app/PlannerView.svelte` |
| Boards (per-project columns) | 🟡 | `src/lib/app/BoardView.svelte` |
| Insights | 🟡 | `src/lib/app/InsightsView.svelte` |
| Search dialog | 🟡 | `src/lib/app/SearchDialog.svelte` |
| Settings dialog | 🟡 | `src/lib/app/SettingsDialog.svelte` |
| Sync settings + providers | ✅ | `src/lib/app/SyncSettings.svelte` |
| Activity dialog | ✅ | `src/lib/app/ActivityDialog.svelte` |

## Phase 4+ — Views & planning, integrations, platform, sync

| Feature | Status | Owning file |
|---|---|---|
| Schedule / TickTick planning pane | ❌ | `src/lib/app/AppShell.svelte` |
| Eisenhower matrix | ❌ | `src/lib/app/AppShell.svelte` |
| Notes view (Markdown + bookmarks) | ❌ | `src/lib/app/AppShell.svelte` |
| History view + Worklog/timesheet | ❌ | `src/lib/app/InsightsView.svelte` |
| Tags manager | ❌ | `src/lib/app/AppShell.svelte` |
| Provider registry (15 providers) | ✅ | `packages/integrations/src/index.ts` |
| Provider clients + OAuth + polling + ingest | ❌ | `packages/integrations/src/index.ts` |
| NouraSync server (Bun, full service set) | 🔒 | `packages/noura-sync-server/src/index.ts` |
| Sync-core (encryption, vector clocks, conflicts) | 🔒 | `packages/sync-core/src/index.ts` |
| File providers (WebDAV/Nextcloud/Dropbox/OneDrive/local) | 🔒 | `packages/sync-providers/src/provider-types.ts` |
| Platform ports (credentials/files/clipboard/http/notifications/shell/desktop/backup) | 🟡 | `packages/platform/src/index.ts` |
| Tauri host (SQLite, dialog, opener, store, updater) | 🔒 | `apps/client/src-tauri/src/lib.rs` |

## Differential fixtures

`packages/domain/src/differential/fixtures/*.json` freeze normalized reference
states; `differential.spec.ts` re-applies the command batches and asserts
byte-identical normalized output. Baseline covers `tasks-basic` and
`projects-tags-config`.
