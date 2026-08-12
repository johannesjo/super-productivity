// Parity ledger — machine-checkable source of truth for the "1-to-1" feature
// definition in docs/parity.md. A spec verifies every owner path exists so the
// ledger cannot drift from the codebase.
export const PARITY_LEDGER = [
    {
        area: 'Domain core',
        status: 'implemented',
        entries: [
            {
                feature: 'Task model (full fields incl. start/due+time, doneOn, estimates)',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Subtask tree (nested, infinite depth)',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Task sections (divisions with passing items)',
                owner: 'packages/domain/src/entities.ts',
            },
            {
                feature: 'Project settings (color, icon, themes, archived)',
                owner: 'packages/domain/src/entities.ts',
            },
            {
                feature: 'Tag CRUD + colors',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'TaskRepeatCfg recurrence engine + rollover',
                owner: 'packages/domain/src/recurrence.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Note entity + bookmarks/attachments',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Worklog entity (start/end/task/dates)',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'SimpleCounter entity + tick/toggle',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'WorkContext entity + switch/focus',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'IssueProviderCfg (settings, no secret persistence)',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'GlobalConfig / UserProfile persisted settings',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'TaskViewConfig per-view customization',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Archives (young/old) + history + resets',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'TrackedEntry (fixed start/end, manual + timer)',
                owner: 'packages/domain/src/entities.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Smart list entity + evaluation',
                owner: 'packages/domain/src/selectors.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Project removal (tasks/notes -> fallback project)',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/application/src/planner.spec.ts',
            },
            {
                feature: 'Deterministic, immutable reducer (ADR-003)',
                owner: 'packages/domain/src/reducer.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
        ],
    },
    {
        area: 'Legacy migration',
        status: 'implemented',
        entries: [
            {
                feature: 'Complete SP backup → Noura (multi-family)',
                owner: 'packages/domain/src/migrate.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'v1 → v2 domain state migration',
                owner: 'packages/domain/src/migrate.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Reminder resolution + subtask tree reconstruction',
                owner: 'packages/domain/src/migrate.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
        ],
    },
    {
        area: 'Application layer',
        status: 'partial',
        entries: [
            {
                feature: 'DomainStore (one intent → one persisted operation)',
                owner: 'packages/application/src/index.ts',
                tests: 'packages/application/src/store.spec.ts',
            },
            {
                feature: 'EncryptedOperationTransport (sync-core encryption)',
                owner: 'packages/application/src/sync.ts',
                tests: 'packages/application/src/sync.spec.ts',
            },
            {
                feature: 'NouraSync HTTP endpoint + WebSocket subscribe',
                owner: 'packages/application/src/sync.ts',
            },
            {
                feature: 'File provider endpoints (WebDAV/Nextcloud/Dropbox/OneDrive/local)',
                owner: 'packages/application/src/sync.ts',
            },
            {
                feature: 'Selectors package (planner buckets, smart lists, metrics)',
                owner: 'packages/domain/src/selectors.ts',
                tests: 'packages/domain/src/domain.spec.ts',
            },
            {
                feature: 'Effects/orchestration (day strategies, finish-day)',
                owner: 'packages/application/src/effects/daily.ts',
                tests: 'packages/application/src/effects.spec.ts',
            },
            {
                feature: 'Reminder scheduler service',
                owner: 'packages/application/src/services/reminder-scheduler.ts',
                tests: 'packages/application/src/services.spec.ts',
            },
            {
                feature: 'Tracking-reminder + take-a-break services',
                owner: 'packages/application/src/services/tracking-reminder.ts',
                tests: 'packages/application/src/services.spec.ts',
            },
            {
                feature: 'Idle detection + idle-split tracking',
                owner: 'packages/application/src/services/idle.ts',
                tests: 'packages/application/src/services.spec.ts',
            },
            {
                feature: 'Global full-text search index',
                owner: 'packages/application/src/services/search.ts',
                tests: 'packages/application/src/services.spec.ts',
            },
            {
                feature: 'Notifications + global shortcuts services',
                owner: 'packages/application/src/services/notifications.ts',
                tests: 'packages/application/src/services.spec.ts',
            },
            {
                feature: 'Focus effects (completion→history, summary→worklog)',
                owner: 'packages/application/src/effects/focus.ts',
                tests: 'packages/application/src/effects.spec.ts',
            },
            {
                feature: 'i18n framework + en/de locales (structure for 175)',
                owner: 'packages/application/src/i18n.ts',
                tests: 'packages/application/src/i18n.spec.ts',
            },
            {
                feature: 'Encrypted backup (AES-GCM)',
                owner: 'packages/application/src/backup.ts',
                tests: 'packages/application/src/backup.spec.ts',
            },
            {
                feature: 'Capture syntax parser (due/start/remind/repeat/tags/project/prio/subtask)',
                owner: 'packages/application/src/capture.ts',
                tests: 'packages/application/src/capture.spec.ts',
            },
            {
                feature: 'Local REST API (offline backend surface)',
                owner: 'packages/application/src/local-http.ts',
                tests: 'packages/application/src/local-http.spec.ts',
            },
        ],
    },
    {
        area: 'Shell & core task UI (TickTick target)',
        status: 'partial',
        entries: [
            {
                feature: 'App shell (56px rail, resizable panes, sheet <1280 / overlay <960 / single <640)',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
            },
            {
                feature: 'Sidebar (Today/Upcoming/Inbox/projects)',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
            },
            {
                feature: 'Quick capture with syntax (due/start/remind/repeat/tags/project/prio/subtask) wired to the model',
                owner: 'apps/client/src/lib/app/model.svelte.ts',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Task list: nested subtask tree render, sections, inline edit, drag-and-drop reorder, context menu',
                owner: 'apps/client/src/lib/app/TaskWorkspace.svelte',
                tests: 'apps/client/e2e/tasklist.e2e.ts',
            },
            {
                feature: 'Inspector: schedule date+time, engine-backed repeat editor + preview, reminder, Markdown edit/preview, per-task tracking, tags picker, attachments open/remove, issue panel',
                owner: 'apps/client/src/lib/app/TaskInspector.svelte',
                tests: 'apps/client/e2e/inspector.e2e.ts',
            },
            {
                feature: 'XSS-safe Markdown renderer (notes preview)',
                owner: 'packages/application/src/md.ts',
                tests: 'packages/application/src/md.spec.ts',
            },
            {
                feature: 'Focus view (pomodoro/flowtime/stopwatch + stats + take-a-break + tracking reminders)',
                owner: 'apps/client/src/lib/app/FocusView.svelte',
            },
            {
                feature: 'Idle-split: suspend + resume a tracked entry around an idle gap',
                owner: 'apps/client/src/lib/app/model.svelte.ts',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'User profile display name (persisted)',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Simple counters UI (config, tick, start/stop, remove)',
                owner: 'apps/client/src/lib/app/FocusView.svelte',
                tests: 'apps/client/e2e/focus-counters.e2e.ts',
            },
            {
                feature: 'Focus-day summary → durable worklog rows',
                owner: 'apps/client/src/lib/app/model.svelte.ts',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Planner month grid',
                owner: 'apps/client/src/lib/app/PlannerView.svelte',
            },
            {
                feature: 'Boards: per-project kanban, status columns with drag-to-move, WIP limits, work-context boards',
                owner: 'apps/client/src/lib/app/BoardView.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Metrics weekly/daily charts + top tasks',
                owner: 'apps/client/src/lib/app/InsightsView.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Metrics derivation (framework-free)',
                owner: 'packages/application/src/metrics.ts',
                tests: 'packages/application/src/metrics.spec.ts',
            },
            {
                feature: 'Search: full index (tasks/notes/tags/projects) + actions',
                owner: 'apps/client/src/lib/app/SearchDialog.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Settings persisted to GlobalConfig (theme, date/time, notifications, focus & tracking)',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
                tests: 'apps/client/e2e/settings.e2e.ts',
            },
            {
                feature: 'Welcome tour (onboarding) + persisted completion flag',
                owner: 'apps/client/src/lib/app/OnboardingDialog.svelte',
                tests: 'apps/client/e2e/settings.e2e.ts',
            },
            {
                feature: 'Shortcut editor + cheat sheet persisted to GlobalConfig',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Light/dark/system themes applied + persisted',
                owner: 'apps/client/src/lib/app/model.svelte.ts',
                tests: 'apps/client/e2e/settings.e2e.ts',
            },
            {
                feature: 'Work-context switching in the sidebar',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Translated shell strings (nav, sidebar, workspace headings)',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
                tests: 'apps/client/e2e/settings.e2e.ts',
            },
            {
                feature: 'Schedule/TickTick planning pane (Today/This week/planning inbox)',
                owner: 'apps/client/src/lib/app/ScheduleView.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Account/devices/conflicts status dialog (rail)',
                owner: 'apps/client/src/lib/app/SyncStatusDialog.svelte',
                tests: 'apps/client/e2e/sync.e2e.ts',
            },
            {
                feature: 'Sync status rail widget + device/client id line',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
                tests: 'apps/client/e2e/sync.e2e.ts',
            },
            {
                feature: 'Sync settings + providers',
                owner: 'apps/client/src/lib/app/SyncSettings.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Activity dialog',
                owner: 'apps/client/src/lib/app/ActivityDialog.svelte',
            },
        ],
    },
    {
        area: 'Views & planning',
        status: 'partial',
        entries: [
            {
                feature: 'Planner: week + month views, drag-to-schedule, recurrence-aware occurrences',
                owner: 'apps/client/src/lib/app/PlannerView.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Planner projections (week buckets + recurring occurrences)',
                owner: 'packages/application/src/planner.ts',
                tests: 'packages/application/src/planner.spec.ts',
            },
            {
                feature: 'Project/Tag management UI (rename, recolor, archive, delete)',
                owner: 'apps/client/src/lib/app/OrgDialog.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Eisenhower matrix view',
                owner: 'apps/client/src/lib/app/EisenhowerView.svelte',
                tests: 'apps/client/e2e/views.e2e.ts',
            },
            {
                feature: 'Eisenhower derivation (framework-free)',
                owner: 'packages/application/src/eisenhower.ts',
                tests: 'packages/application/src/eisenhower-worklog.spec.ts',
            },
            {
                feature: 'Notes view (Markdown editor + bookmarks/search)',
                owner: 'apps/client/src/lib/app/NotesView.svelte',
                tests: 'apps/client/e2e/views.e2e.ts',
            },
            {
                feature: 'History view (done tasks, chart)',
                owner: 'apps/client/src/lib/app/HistoryView.svelte',
                tests: 'apps/client/e2e/views.e2e.ts',
            },
            {
                feature: 'Worklog/timesheet view + CSV export',
                owner: 'apps/client/src/lib/app/HistoryView.svelte',
                tests: 'apps/client/e2e/views.e2e.ts',
            },
            {
                feature: 'Worklog projection + CSV export (framework-free)',
                owner: 'packages/application/src/worklog.ts',
                tests: 'packages/application/src/eisenhower-worklog.spec.ts',
            },
            {
                feature: 'Tags manager',
                owner: 'apps/client/src/lib/app/OrgDialog.svelte',
            },
        ],
    },
    {
        area: 'Integrations',
        status: 'partial',
        entries: [
            {
                feature: 'Provider registry (15 providers)',
                owner: 'packages/integrations/src/index.ts',
                tests: 'packages/integrations/src/index.spec.ts',
            },
            {
                feature: 'Framework-free HTTP/auth client base (token/basic/oauth2)',
                owner: 'packages/integrations/src/http.ts',
                tests: 'packages/integrations/src/clients.spec.ts',
            },
            {
                feature: 'Transforms: issue->task seed, backlog import, comments',
                owner: 'packages/integrations/src/transforms.ts',
                tests: 'packages/integrations/src/clients.spec.ts',
            },
            {
                feature: 'Jira client (search/get/comment/worklogs/test-connection)',
                owner: 'packages/integrations/src/jira.ts',
                tests: 'packages/integrations/src/clients.spec.ts',
            },
            {
                feature: 'iCalendar parser + CalDAV client (window query)',
                owner: 'packages/integrations/src/ical.ts',
                tests: 'packages/integrations/src/clients.spec.ts',
            },
            {
                feature: 'Calendar agenda projection (Planner overlay)',
                owner: 'packages/application/src/calendar.ts',
                tests: 'packages/application/src/calendar.spec.ts',
            },
            {
                feature: 'iCal feed -> Planner week agenda (load + parse)',
                owner: 'apps/client/src/lib/app/PlannerView.svelte',
                tests: 'apps/client/e2e/planning.e2e.ts',
            },
            {
                feature: 'Pinned-search polling (dedupe) + worklog export',
                owner: 'packages/integrations/src/polling.ts',
                tests: 'packages/integrations/src/clients.spec.ts',
            },
            {
                feature: 'Settings UI wiring: Jira test-connection + backlog import',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
                tests: 'apps/client/e2e/integration.e2e.ts',
            },
            {
                feature: 'Provider pipeline E2E over headless mock server (Jira + CalDAV)',
                owner: 'packages/integrations/src/mock-server.ts',
                tests: 'packages/integrations/src/e2e.pipeline.spec.ts',
            },
        ],
    },
    {
        area: 'Sync server (retained)',
        status: 'retained',
        entries: [
            {
                feature: 'NouraSync server (Bun, full service set)',
                owner: 'packages/noura-sync-server/src/index.ts',
            },
            {
                feature: 'Sync-core (encryption, vector clocks, conflict resolution)',
                owner: 'packages/sync-core/src/index.ts',
                tests: 'packages/sync-core/tests/encryption.spec.ts',
            },
            {
                feature: 'File providers WebDAV/Nextcloud/Dropbox/OneDrive/local',
                owner: 'packages/sync-providers/src/provider-types.ts',
            },
        ],
    },
    {
        area: 'Platform & desktop',
        status: 'partial',
        entries: [
            {
                feature: 'Platform ports (credentials, files, clipboard, http, notifications, shell, desktop, backup)',
                owner: 'packages/platform/src/index.ts',
            },
            {
                feature: 'Web platform adapters + in-memory credentials store',
                owner: 'packages/platform/src/web.ts',
                tests: 'packages/platform/src/web.spec.ts',
            },
            {
                feature: 'PWA service worker (cache-first shell + offline navigations)',
                owner: 'apps/client/src/service-worker.ts',
                tests: 'apps/client/e2e/offline.e2e.ts',
            },
            {
                feature: 'Encrypted backup export/import UI (AES-GCM)',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Tauri host (SQLite, dialog, opener, store, updater)',
                owner: 'apps/client/src-tauri/src/lib.rs',
            },
        ],
    },
];
/** Every unique owner referenced across areas (for spec assertions). */
export const parityOwners = () => [
    ...new Set(PARITY_LEDGER.flatMap((area) => area.entries.map((entry) => entry.owner))),
];
export const parityOwnerFiles = () => [
    ...new Set(PARITY_LEDGER.flatMap((area) => area.entries.flatMap((entry) => [entry.owner, entry.tests].filter((path) => Boolean(path))))),
];
