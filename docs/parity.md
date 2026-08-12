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
| Selectors package (planner buckets, smart lists, metrics, search index) | ✅ | `packages/domain/src/selectors.ts` + `packages/application/src/services/search.ts` | `packages/application/src/services.spec.ts` |
| Day effects (finish-day summary, plan-tomorrow, morning review) | ✅ | `packages/application/src/effects/daily.ts` | `packages/application/src/effects.spec.ts` |
| Focus effects (completion→history, summary→worklog) | ✅ | `packages/application/src/effects/focus.ts` | `packages/application/src/effects.spec.ts` |
| Reminder scheduler service | ✅ | `packages/application/src/services/reminder-scheduler.ts` | `packages/application/src/services.spec.ts` |
| Tracking-reminder + take-a-break services | ✅ | `packages/application/src/services/tracking-reminder.ts` | `packages/application/src/services.spec.ts` |
| Idle detection + idle-split tracking | ✅ | `packages/application/src/services/idle.ts` | `packages/application/src/services.spec.ts` |
| Global full-text search | ✅ | `packages/application/src/services/search.ts` | `packages/application/src/services.spec.ts` |
| Notifications + global shortcuts services | ✅ | `packages/application/src/services/notifications.ts` / `shortcuts.ts` | `packages/application/src/services.spec.ts` |
| Local REST API (offline backend surface) | ✅ | `packages/application/src/local-http.ts` | `packages/application/src/local-http.spec.ts` |
| Capture syntax parser (due/start/remind/repeat/tags/project/prio/subtask) | ✅ | `packages/application/src/capture.ts` | `packages/application/src/capture.spec.ts` |
| Platform adapters (credentials/files/clipboard/http/notifications/tray/backup) | 🟡 | `packages/platform/src/index.ts` + `packages/platform/src/web.ts` | `packages/platform/src/web.spec.ts` |

## Phase 3 — Shell & core task UI (TickTick target, `apps/client`)

| Feature | Status | Owning file |
|---|---|---|
| App shell (56px rail, resizable panes, sheet <1280 / overlay <960 / single <640) | ✅ | `src/lib/app/AppShell.svelte` |
| Sidebar (Today/Upcoming/Inbox/projects) | ✅ | `src/lib/app/AppShell.svelte` |
| Quick capture with syntax parsing (due/start/remind/repeat/tags/project/prio/subtask) | 🟡 | `apps/client/src/lib/app/model.svelte.ts` + `packages/application/src/capture.ts` | `apps/client/src/lib/app/model.spec.ts` + `apps/client/e2e/capture.e2e.ts` |
| Task list: nested subtask tree render, sections, inline edit, drag-and-drop reorder, context menu | 🟡 | `src/lib/app/TaskWorkspace.svelte` | `apps/client/e2e/tasklist.e2e.ts` |
| Inspector: schedule date+time, engine-backed repeat editor + next-date preview, reminder, Markdown edit/preview, per-task tracking, tags picker, attachments open/remove, issue panel | 🟡 | `src/lib/app/TaskInspector.svelte` | `apps/client/e2e/inspector.e2e.ts` |
| XSS-safe Markdown renderer (notes preview) | ✅ | `packages/application/src/md.ts` | `packages/application/src/md.spec.ts` |
| Task list (compact rows, checklist progress) | 🟡 | `src/lib/app/TaskWorkspace.svelte` |
| Inspector (schedule, notes, checklist, tags, repeat, attachments, tracking) | 🟡 | `src/lib/app/TaskInspector.svelte` |
| Focus view (pomodoro/flowtime/stopwatch + stats) | 🟡 | `src/lib/app/FocusView.svelte` |
| Planner week + month (drag-to-schedule, recurrence-aware) | 🟡 | `src/lib/app/PlannerView.svelte` |
| Boards (per-project kanban, WIP, drag-to-move, work-context boards) | 🟡 | `src/lib/app/BoardView.svelte` |
| Insights (weekly/daily focus charts + top tasks) | 🟡 | `src/lib/app/InsightsView.svelte` (+ `packages/application/src/metrics.ts`) |
| Search (full index: tasks/notes/tags/projects + actions) | 🟡 | `src/lib/app/SearchDialog.svelte` |
| Settings persisted to GlobalConfig (theme/date/notifications/focus) | 🟡 | `src/lib/app/SettingsDialog.svelte` |
| i18n framework + en/de locales (structure for 175) + language selector | ✅ | `packages/application/src/i18n.ts` |
| Shortcut editor/cheat sheet persisted to GlobalConfig | ✅ | `src/lib/app/SettingsDialog.svelte` + `packages/domain/src/entities.ts` |
| Sync settings + providers | ✅ | `src/lib/app/SyncSettings.svelte` |
| Activity dialog | ✅ | `src/lib/app/ActivityDialog.svelte` |

## Phase 4+ — Views & planning, integrations, platform, sync

| Feature | Status | Owning file |
|---|---|---|
| Planner (week + month, drag-to-schedule, recurrence-aware) | 🟡 | `src/lib/app/PlannerView.svelte` (+ `packages/application/src/planner.ts`) |
| Schedule / TickTick planning pane (Today/This week/planning inbox) | 🟡 | `src/lib/app/ScheduleView.svelte` |
| Eisenhower matrix | 🟡 | `src/lib/app/EisenhowerView.svelte` (+ `packages/application/src/eisenhower.ts`) |
| Notes view (Markdown editor + bookmarks) | 🟡 | `src/lib/app/NotesView.svelte` |
| History view (done tasks, charts) | 🟡 | `src/lib/app/HistoryView.svelte` |
| Worklog/timesheet (incl. CSV export) | 🟡 | `src/lib/app/HistoryView.svelte` (+ `packages/application/src/worklog.ts`) |
| Project/Tag management UI | ✅ | `src/lib/app/OrgDialog.svelte` |
| Provider registry (15 providers) | ✅ | `packages/integrations/src/index.ts` |
| HTTP/auth client base (token/basic/oauth2) + transforms (issue→task seed, backlog import) | ✅ | `packages/integrations/src/http.ts` / `transforms.ts` |
| Jira client (search/get/comment/worklogs/test-connection) | ✅ | `packages/integrations/src/jira.ts` |
| iCalendar parser + CalDAV client (window query) | ✅ | `packages/integrations/src/ical.ts` / `caldav.ts` |
| Pinned-search polling (dedupe) + worklog export | ✅ | `packages/integrations/src/polling.ts` / `worklog-export.ts` |
| Jira + CalDAV pipeline E2E (headless mock server) | ✅ | `packages/integrations/src/e2e.pipeline.spec.ts` |
| Provider clients wired into the UI (per-provider OAuth, remote updates, calendar agenda in Planner) | ❌ | `apps/client/src/lib/app/SettingsDialog.svelte` |
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
