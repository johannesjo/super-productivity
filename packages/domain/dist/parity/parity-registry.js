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
                owner: 'apps/client/src/lib/app/model.svelte.ts',
            },
            { feature: 'Reminders scheduler', owner: 'packages/platform/src/index.ts' },
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
                feature: 'Quick capture with due/project/status',
                owner: 'apps/client/src/lib/app/TaskCaptureDialog.svelte',
                tests: 'apps/client/src/lib/app/model.spec.ts',
            },
            {
                feature: 'Task list (compact rows, checklist progress)',
                owner: 'apps/client/src/lib/app/TaskWorkspace.svelte',
            },
            {
                feature: 'Inspector (schedule, notes, checklist, tags, attachments, repeat)',
                owner: 'apps/client/src/lib/app/TaskInspector.svelte',
            },
            {
                feature: 'Focus view (pomodoro/flowtime/stopwatch + stats)',
                owner: 'apps/client/src/lib/app/FocusView.svelte',
            },
            {
                feature: 'Planner month grid',
                owner: 'apps/client/src/lib/app/PlannerView.svelte',
            },
            {
                feature: 'Boards (per-project, kanban columns)',
                owner: 'apps/client/src/lib/app/BoardView.svelte',
            },
            { feature: 'Insights', owner: 'apps/client/src/lib/app/InsightsView.svelte' },
            {
                feature: 'Search dialog (tasks + nav + settings)',
                owner: 'apps/client/src/lib/app/SearchDialog.svelte',
            },
            {
                feature: 'Settings dialog (8 sections)',
                owner: 'apps/client/src/lib/app/SettingsDialog.svelte',
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
        status: 'absent',
        entries: [
            {
                feature: 'Schedule/TickTick planning pane',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
            },
            { feature: 'Eisenhower matrix', owner: 'apps/client/src/lib/app/AppShell.svelte' },
            {
                feature: 'Notes view (Markdown + bookmarks)',
                owner: 'apps/client/src/lib/app/AppShell.svelte',
            },
            {
                feature: 'History view (done, resets, charts)',
                owner: 'apps/client/src/lib/app/InsightsView.svelte',
            },
            {
                feature: 'Worklog/timesheet view',
                owner: 'apps/client/src/lib/app/InsightsView.svelte',
            },
            { feature: 'Tags manager', owner: 'apps/client/src/lib/app/AppShell.svelte' },
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
                feature: 'Client adapters + OAuth + polling + ingest (per provider)',
                owner: 'packages/integrations/src/index.ts',
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
