import { describe, expect, it } from 'vitest';
import { createInitialState, expandRepeatConfig, getRepeatConfigNextDate, importAnyState, migrateDomainState, migrateLegacyBackupToNoura, reduceDomain, selectOrderedTasks, selectSmartListTasks, selectSubtasks, selectTotalTrackedOn, } from './index';
const baseTask = (overrides = {}) => ({
    id: 'task-1',
    title: 'Write migration plan',
    notes: '',
    status: 'open',
    priority: 1,
    projectId: 'inbox',
    subtaskIds: [],
    tagIds: [],
    checklist: [],
    sections: [],
    attachments: [],
    estimateMs: 0,
    trackedMs: 0,
    createdAt: 1,
    updatedAt: 1,
    order: 0,
    ...overrides,
});
const counterCfg = (overrides = {}) => ({
    id: 'cfg-daily',
    title: 'Every day',
    repeatEvery: 1,
    repeatEveryUnit: 'DAILY',
    daysOfWeek: [],
    repeatOffset: 0,
    createdAt: 1,
    modifiedAt: 1,
    ...overrides,
});
describe('reduceDomain — core task transitions', () => {
    it('creates exactly one immutable task transition per command', () => {
        const before = createInitialState(1);
        const after = reduceDomain(before, {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        expect(before.tasks).toEqual({});
        expect(after.tasks['task-1']).toEqual(baseTask());
        expect(after.taskOrder).toEqual(['task-1']);
    });
    it('toggles completion deterministically from the supplied logical time', () => {
        const added = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        const done = reduceDomain(added, {
            type: 'task/toggle',
            payload: { id: 'task-1', doneOn: 42 },
        });
        expect(done.tasks['task-1']?.status).toBe('done');
        expect(done.tasks['task-1']?.doneOn).toBe(42);
        const undone = reduceDomain(done, {
            type: 'task/toggle',
            payload: { id: 'task-1', doneOn: 43 },
        });
        expect(undone.tasks['task-1']?.status).toBe('open');
        expect(undone.tasks['task-1']?.doneOn).toBeUndefined();
    });
    it('links a subtask into a nested tree when added with a parentId', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask({ id: 'parent' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: baseTask({ id: 'child', parentId: 'parent', title: 'Child' }),
            },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: baseTask({ id: 'grandchild', parentId: 'child', title: 'Grandchild' }),
            },
        });
        expect(state.tasks.parent?.subtaskIds).toEqual(['child']);
        expect(state.tasks.child?.subtaskIds).toEqual(['grandchild']);
        expect(selectSubtasks(state, 'parent').map((task) => task.id)).toEqual(['child']);
    });
    it('removes a task with its whole subtree', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask({ id: 'parent' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask({ id: 'child', parentId: 'parent' }) },
        });
        state = reduceDomain(state, {
            type: 'task/remove',
            payload: { id: 'parent' },
        });
        expect(state.tasks.parent).toBeUndefined();
        expect(state.tasks.child).toBeUndefined();
        expect(state.taskOrder).toEqual([]);
    });
});
describe('reduceDomain — tracked entries with fixed start/end', () => {
    it('records completed focus time on its linked task', () => {
        const withTask = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        const started = reduceDomain(withTask, {
            type: 'session/start',
            payload: {
                session: {
                    id: 'session-1',
                    taskId: 'task-1',
                    mode: 'pomodoro',
                    startedAt: 100,
                    durationMs: 0,
                    source: 'timer',
                    updatedAt: 100,
                },
            },
        });
        const stopped = reduceDomain(started, {
            type: 'session/stop',
            payload: { id: 'session-1', endedAt: 600_100, durationMs: 600_000 },
        });
        expect(stopped.trackedEntries['session-1']?.durationMs).toBe(600_000);
        expect(stopped.trackedEntries['session-1']?.endedAt).toBe(600_100);
        expect(stopped.tasks['task-1']?.trackedMs).toBe(600_000);
        expect(stopped.activeSessionId).toBeUndefined();
    });
    it('accepts manually logged entries with fixed start and end', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        state = reduceDomain(state, {
            type: 'session/manual',
            payload: {
                entry: {
                    id: 'manual-1',
                    taskId: 'task-1',
                    mode: 'stopwatch',
                    startedAt: 9_000,
                    endedAt: 10_500,
                    durationMs: 1_500,
                    date: '2026-07-20',
                    source: 'manual',
                    updatedAt: 10_500,
                },
            },
        });
        expect(state.trackedEntries['manual-1']?.source).toBe('manual');
        expect(state.tasks['task-1']?.trackedMs).toBe(1_500);
        expect(selectTotalTrackedOn(state, '2026-07-20')).toBe(1_500);
    });
});
describe('reduceDomain — new entity commands', () => {
    it('creates and updates tags', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'tag/add',
            payload: { tag: { id: 't1', title: 'Work', color: 'blue' } },
        });
        expect(state.tags.t1?.title).toBe('Work');
        state = reduceDomain(state, {
            type: 'tag/update',
            payload: { id: 't1', patch: { title: 'Deep work' } },
        });
        expect(state.tags.t1?.title).toBe('Deep work');
    });
    it('removing a tag also strips it from tasks', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask({ tagIds: ['t1'] }) },
        });
        state = reduceDomain(state, {
            type: 'tag/add',
            payload: { tag: { id: 't1', title: 'Work', color: 'blue' } },
        });
        state = reduceDomain(state, { type: 'tag/remove', payload: { id: 't1' } });
        expect(state.tasks['task-1']?.tagIds).toEqual([]);
    });
    it('stores repeat configs and resolves task references', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'repeatCfg/add',
            payload: { cfg: counterCfg() },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask({ repeatCfgId: 'cfg-daily' }) },
        });
        expect(state.taskRepeatCfgs['cfg-daily']?.repeatEveryUnit).toBe('DAILY');
        expect(state.tasks['task-1']?.repeatCfgId).toBe('cfg-daily');
        state = reduceDomain(state, {
            type: 'repeatCfg/remove',
            payload: { id: 'cfg-daily' },
        });
        expect(state.tasks['task-1']?.repeatCfgId).toBeUndefined();
    });
    it('adds, updates and removes notes with bookmarks', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'note/add',
            payload: {
                note: {
                    id: 'n1',
                    projectId: 'inbox',
                    content: '# Hello',
                    bookmarks: [],
                    attachments: [],
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'note-bookmark/add',
            payload: {
                noteId: 'n1',
                bookmark: {
                    id: 'bm1',
                    noteId: 'n1',
                    path: 'folder/a.txt',
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        expect(state.notes.n1?.bookmarks).toHaveLength(1);
        state = reduceDomain(state, {
            type: 'note/update',
            payload: { id: 'n1', patch: { content: '# Updated' } },
        });
        expect(state.notes.n1?.content).toBe('# Updated');
        state = reduceDomain(state, { type: 'note/remove', payload: { id: 'n1' } });
        expect(state.notes.n1).toBeUndefined();
    });
    it('creates a worklog from a finished tracked entry', () => {
        const state = reduceDomain(createInitialState(1), {
            type: 'worklog/from-entry',
            payload: {
                entry: {
                    id: 'w1',
                    taskId: 'task-1',
                    mode: 'flowtime',
                    startedAt: 100,
                    endedAt: 200,
                    durationMs: 100,
                    date: '2026-07-20',
                    source: 'timer',
                    updatedAt: 200,
                },
            },
        });
        expect(state.worklogs.w1).toMatchObject({
            taskId: 'task-1',
            started: 100,
            ended: 200,
            duration: 100,
            date: '2026-07-20',
        });
    });
    it('toggles and ticks simple counters', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'counter/add',
            payload: {
                counter: {
                    id: 'c1',
                    title: 'Pomodoros',
                    counterType: 'COUNTER',
                    counterOn: false,
                    counterValue: 0,
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'counter/tick',
            payload: { id: 'c1', value: 2 },
        });
        expect(state.counters.c1?.counterValue).toBe(2);
        state = reduceDomain(state, {
            type: 'counter/toggle',
            payload: { id: 'c1', at: 500 },
        });
        expect(state.counters.c1?.counterOn).toBe(true);
        expect(state.counters.c1?.startedAt).toBe(500);
    });
    it('switches active work contexts', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'workcontext/add',
            payload: {
                context: {
                    id: 'work',
                    title: 'Client',
                    icon: 'briefcase',
                    isEnabled: true,
                    isPersistent: true,
                    taskIds: [],
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, { type: 'workcontext/switch', payload: { id: 'work' } });
        expect(state.activeWorkContextId).toBe('work');
    });
    it('stores issue provider configuration', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'issueProvider/add',
            payload: {
                cfg: {
                    id: 'JIRA',
                    providerId: 'JIRA',
                    cfg: {
                        apiHost: 'https://example.atlassian.net',
                        userName: 'me',
                        hasPassword: true,
                    },
                    enabled: true,
                    isNotifyOnNewIssueToMe: true,
                    isShowIssueId: true,
                    isShowTimeTracking: true,
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        expect(state.issueProviders.JIRA?.cfg?.apiHost).toContain('atlassian');
        state = reduceDomain(state, {
            type: 'issueProvider/update',
            payload: { id: 'JIRA', patch: { enabled: false } },
        });
        expect(state.issueProviders.JIRA?.enabled).toBe(false);
    });
    it('updates global config and per-view task config', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'config/update',
            payload: { patch: { themeMode: 'light', language: 'de' } },
        });
        expect(state.config.themeMode).toBe('light');
        expect(state.config.language).toBe('de');
        state = reduceDomain(state, {
            type: 'taskView/update',
            payload: { id: 'today', patch: { isHideDone: false } },
        });
        expect(state.taskViewConfigs.today?.isHideDone).toBe(false);
    });
    it('evaluates smart lists from their persisted criteria', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask({ id: 'a', priority: 3, dueDay: '2026-07-20' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask({ id: 'b', priority: 0 }) },
        });
        const list = {
            id: 'hifi',
            title: 'High priority',
            order: 0,
            listConfig: {
                isShowCompletedTasks: false,
                filterCriteria: [{ type: 'PRIORITY', value: '2' }],
            },
            createdAt: 1,
            modifiedAt: 1,
        };
        expect(selectSmartListTasks(state, list).map((task) => task.id)).toEqual(['a']);
    });
    it('archives, restores and resets tasks with history', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        state = reduceDomain(state, {
            type: 'task/archive',
            payload: { id: 'task-1', at: 50 },
        });
        expect(state.tasks['task-1']?.status).toBe('archived');
        expect(state.archives['task-1']?.bucket).toBe('young');
        state = reduceDomain(state, { type: 'task/restore', payload: { id: 'task-1' } });
        expect(state.tasks['task-1']?.status).toBe('open');
        expect(state.archives['task-1']).toBeUndefined();
        state = reduceDomain(state, {
            type: 'task/toggle',
            payload: { id: 'task-1', doneOn: 60 },
        });
        state = reduceDomain(state, {
            type: 'task/reset',
            payload: { id: 'task-1', at: 70 },
        });
        expect(state.tasks['task-1']?.status).toBe('open');
        expect(state.tasks['task-1']?.doneOn).toBeUndefined();
        state = reduceDomain(state, {
            type: 'history/record',
            payload: {
                entry: {
                    id: 'h1',
                    date: '2026-07-20',
                    totalTimeSpent: 1000,
                    totalTimeEstimate: 2000,
                    tasksDone: 3,
                    resets: 0,
                    createdAt: 70,
                },
            },
        });
        expect(state.history.h1?.tasksDone).toBe(3);
    });
});
describe('recurrence engine', () => {
    it('rolls a daily task forward by one day', () => {
        const next = getRepeatConfigNextDate(counterCfg(), '2026-07-01');
        expect(next).toBe('2026-07-02');
    });
    it('honors repeatEvery for daily recurrence', () => {
        const next = getRepeatConfigNextDate(counterCfg({ repeatEvery: 2, repeatEveryUnit: 'DAILY' }), '2026-07-01');
        expect(next).toBe('2026-07-03');
    });
    it('finds the next matching weekday for weekly recurrence', () => {
        // Mondays + Thursdays starting 2026-07-01 (a Wednesday)
        const cfg = counterCfg({
            id: 'cfg-week',
            repeatEvery: 1,
            repeatEveryUnit: 'WEEKLY',
            daysOfWeek: [1, 4],
            startDate: '2026-07-01',
        });
        expect(getRepeatConfigNextDate(cfg, '2026-07-01')).toBe('2026-07-02'); // Thu
        expect(getRepeatConfigNextDate(cfg, '2026-07-02')).toBe('2026-07-06'); // Mon
    });
    it('respects an end date', () => {
        const next = getRepeatConfigNextDate(counterCfg({ endDate: '2026-07-02' }), '2026-07-02');
        expect(next).toBeUndefined();
    });
    it('expands a schedule across a range', () => {
        const cfg = counterCfg({
            id: 'cfg-week',
            repeatEvery: 1,
            repeatEveryUnit: 'WEEKLY',
            daysOfWeek: [1],
            startDate: '2026-07-01',
        });
        const { dates } = expandRepeatConfig(cfg, '2026-07-01', '2026-07-31');
        expect(dates).toEqual(['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27']);
    });
    it('advances to the same weekday for monthly recurrence by day of month', () => {
        const cfg = counterCfg({
            id: 'cfg-month',
            repeatEvery: 1,
            repeatEveryUnit: 'MONTHLY',
            dayOfMonth: 15,
            startDate: '2026-01-15',
        });
        expect(getRepeatConfigNextDate(cfg, '2026-01-15')).toBe('2026-02-15');
        expect(getRepeatConfigNextDate(cfg, '2026-12-15')).toBe('2027-01-15');
    });
    it('rolls a task over into a fresh occurrence via the reducer', () => {
        let state = reduceDomain(createInitialState(1), {
            type: 'repeatCfg/add',
            payload: { cfg: counterCfg({ lastDay: '2026-07-01' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: {
                task: baseTask({
                    title: 'Water plants',
                    dueDay: '2026-07-01',
                    repeatCfgId: 'cfg-daily',
                }),
            },
        });
        state = reduceDomain(state, {
            type: 'task/toggle',
            payload: { id: 'task-1', doneOn: 5 },
        });
        state = reduceDomain(state, {
            type: 'task/repeat-rollover',
            payload: { id: 'task-1', today: '2026-07-01' },
        });
        const nextId = 'task-1-20260702';
        expect(state.tasks[nextId]).toBeDefined();
        expect(state.tasks[nextId]?.status).toBe('open');
        expect(state.tasks[nextId]?.dueDay).toBe('2026-07-02');
        expect(state.taskRepeatCfgs['cfg-daily']?.lastDay).toBe('2026-07-02');
    });
});
describe('migrateLegacyBackupToNoura', () => {
    const backup = {
        data: {
            project: {
                ids: ['INBOX_PROJECT', 'project-study'],
                entities: {
                    INBOX_PROJECT: { id: 'INBOX_PROJECT', title: 'Inbox' },
                    'project-study': {
                        id: 'project-study',
                        title: 'Study',
                        icon: 'school',
                        theme: { primary: '#3b82f6' },
                    },
                },
            },
            tag: {
                ids: ['tag-reading'],
                entities: { 'tag-reading': { id: 'tag-reading', title: 'Reading' } },
            },
            taskRepeatCfg: {
                ids: ['rc-daily'],
                entities: {
                    'rc-daily': {
                        id: 'rc-daily',
                        title: 'Every day',
                        repeatEvery: 1,
                        repeatEveryUnit: 'DAILY',
                    },
                },
            },
            note: {
                ids: ['note-1'],
                entities: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Notes',
                        content: '# Ideas',
                        projectId: 'project-study',
                        created: 10,
                        modified: 11,
                    },
                },
            },
            workContext: {
                ids: ['work-client'],
                entities: {
                    'work-client': {
                        id: 'work-client',
                        title: 'Client',
                        icon: 'briefcase',
                        isEnabled: true,
                        isPersistent: true,
                    },
                },
            },
            simpleCounter: {
                ids: ['cnt-1'],
                entities: {
                    'cnt-1': {
                        id: 'cnt-1',
                        title: 'Pomodoros',
                        counterType: 'COUNTER',
                        counterValue: 3,
                    },
                },
            },
            smartList: {
                ids: ['sl-1'],
                entities: {
                    'sl-1': {
                        id: 'sl-1',
                        title: 'High priority',
                        listConfig: {
                            isShowCompletedTasks: false,
                            filterCriteria: [{ key: 'PRIORITY', value: '2' }],
                        },
                    },
                },
            },
            task: {
                ids: ['parent', 'child', 'done'],
                entities: {
                    parent: {
                        id: 'parent',
                        title: 'Read paper',
                        projectId: 'project-study',
                        tagIds: ['tag-reading'],
                        subTaskIds: ['child'],
                        dueDay: '2026-07-20',
                        dueDate: 1785643200000,
                        remindAt: 1785643200000,
                        reminderActive: true,
                        repeatCfgId: 'rc-daily',
                        timeEstimate: 3_600_000,
                        timeSpent: 600_000,
                        created: 10,
                        modified: 20,
                    },
                    child: { id: 'child', title: 'Take notes', parentId: 'parent', isDone: true },
                    done: {
                        id: 'done',
                        title: 'Old task',
                        isDone: true,
                        doneOn: 30,
                        projectId: 'project-study',
                    },
                },
            },
            globalConfig: {
                ids: ['cfg'],
                entities: { cfg: { id: 'cfg', language: 'de', isEnableReminders: true } },
            },
            userProfile: {
                ids: ['profile'],
                entities: { profile: { id: 'profile', weekStartDay: 1 } },
            },
            archiveYoung: {
                task: {
                    ids: ['archived'],
                    entities: {
                        archived: {
                            id: 'archived',
                            title: 'Archived',
                            isArchived: true,
                            doneOn: 40,
                            projectId: 'project-study',
                        },
                    },
                },
            },
            archiveOld: { task: { ids: [], entities: {} } },
            plugin: { ids: ['not-migrated'] },
        },
    };
    it('preserves supported data across all migrated entity families', () => {
        const state = migrateLegacyBackupToNoura(backup, 100);
        expect(state.projects['project-study']?.title).toBe('Study');
        expect(state.tags['tag-reading']?.title).toBe('Reading');
        expect(state.taskRepeatCfgs['rc-daily']?.repeatEveryUnit).toBe('DAILY');
        expect(state.notes['note-1']).toMatchObject({
            content: '# Ideas',
            projectId: 'project-study',
        });
        expect(state.workContexts['work-client']?.isEnabled).toBe(true);
        expect(state.counters['cnt-1']?.counterType).toBe('COUNTER');
        expect(state.smartLists['sl-1']?.listConfig.filterCriteria).toEqual([
            { type: 'PRIORITY', value: '2' },
        ]);
        expect(state.config.language).toBe('de');
        // Nested subtask tree, not checklist flattening
        expect(state.tasks.parent?.subtaskIds).toEqual(['child']);
        expect(state.tasks.child?.parentId).toBe('parent');
        expect(state.tasks.parent?.checklist).toEqual([]);
        expect(state.tasks.parent).toMatchObject({
            projectId: 'project-study',
            tagIds: ['tag-reading'],
            dueDay: '2026-07-20',
            estimateMs: 3_600_000,
            trackedMs: 600_000,
            repeatCfgId: 'rc-daily',
        });
        expect(state.tasks.parent?.reminderAt).toBeDefined();
        expect(state.tasks.done).toMatchObject({ status: 'done', doneOn: 30 });
        expect(state.tasks.archived?.status).toBe('archived');
        expect(state).not.toHaveProperty('plugin');
    });
    it('clears reminders that were not active', () => {
        const withInactive = structuredClone(backup);
        withInactive.data.task.entities.parent.reminderActive =
            false;
        const state = migrateLegacyBackupToNoura(withInactive, 100);
        expect(state.tasks.parent?.reminderAt).toBeUndefined();
    });
    it('rejects unknown JSON documents', () => {
        expect(() => migrateLegacyBackupToNoura({ hello: 'world' })).toThrow('Unsupported backup format');
    });
});
describe('migrateDomainState v1 → v2', () => {
    const v1 = {
        schemaVersion: 1,
        tasks: {
            a: {
                id: 'a',
                title: 'A',
                notes: '',
                status: 'done',
                priority: 0,
                projectId: 'inbox',
                tagIds: [],
                checklist: [],
                attachments: [],
                completedAt: 7,
                createdAt: 1,
                updatedAt: 2,
                order: 0,
            },
        },
        projects: {
            inbox: {
                id: 'inbox',
                title: 'Inbox',
                color: 'neutral',
                icon: 'inbox',
                archived: false,
                createdAt: 1,
            },
        },
        tags: {},
        sessions: {
            s1: {
                id: 's1',
                taskId: 'a',
                mode: 'flowtime',
                startedAt: 5,
                endedAt: 10,
                durationMs: 5,
            },
        },
        taskOrder: ['a'],
        activeProjectId: 'inbox',
    };
    it('moves sessions into tracked entries and fills new collections', () => {
        const state = importAnyState(v1);
        expect(state.schemaVersion).toBe(2);
        expect(state.trackedEntries.s1).toMatchObject({
            taskId: 'a',
            source: 'timer',
            durationMs: 5,
            endedAt: 10,
        });
        expect(state.tasks.a?.doneOn).toBe(7);
        expect(state.workContexts.default).toBeDefined();
        expect(state.config).toBeDefined();
        expect(state.taskRepeatCfgs).toEqual({});
    });
    it('migrates a fresh v1 fully-initialized state without data loss', () => {
        const result = migrateDomainState(createInitialState(1));
        expect(result.schemaVersion).toBe(2);
        expect(result.projects.inbox).toBeDefined();
        expect(selectOrderedTasks(result)).toHaveLength(0);
    });
});
describe('selectors', () => {
    it('provides planner buckets used by Today and Upcoming', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask({ id: 'today', dueDay: '2026-07-20' }) },
        });
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask({ id: 'overdue', dueDay: '2026-07-01' }) },
        });
        expect(selectOrderedTasks(state).map((task) => task.id)).toEqual([
            'today',
            'overdue',
        ]);
    });
    it('keeps updates fast for a 10,000 task workspace', () => {
        const tasks = Object.fromEntries(Array.from({ length: 10_000 }, (_, index) => {
            const id = `task-${index}`;
            return [id, baseTask({ id, order: index })];
        }));
        const state = {
            ...createInitialState(1),
            tasks,
            taskOrder: Object.keys(tasks),
        };
        const startedAt = performance.now();
        const after = reduceDomain(state, {
            type: 'task/update',
            payload: { id: 'task-5000', patch: { title: 'Updated' } },
        });
        const ordered = selectOrderedTasks(after);
        expect(ordered).toHaveLength(10_000);
        expect(after.tasks['task-5000']?.title).toBe('Updated');
        expect(performance.now() - startedAt).toBeLessThan(250);
    });
});
describe('reduceDomain — remaining command surface coverage', () => {
    it('covers task update, select, link/unlink issue and state replace', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'task/add',
            payload: { task: baseTask() },
        });
        state = reduceDomain(state, {
            type: 'task/update',
            payload: { id: 'task-1', patch: { title: 'Renamed' } },
        });
        expect(state.tasks['task-1']?.title).toBe('Renamed');
        state = reduceDomain(state, { type: 'task/select', payload: { id: undefined } });
        expect(state.selectedTaskId).toBeUndefined();
        state = reduceDomain(state, {
            type: 'task/link-issue',
            payload: {
                id: 'task-1',
                issue: {
                    providerId: 'JIRA',
                    issueId: 'SP-1',
                    key: 'SP-1',
                    url: 'https://x/SP-1',
                },
            },
        });
        expect(state.tasks['task-1']?.issue?.key).toBe('SP-1');
        state = reduceDomain(state, { type: 'task/unlink-issue', payload: { id: 'task-1' } });
        expect(state.tasks['task-1']?.issue).toBeUndefined();
        const fresh = createInitialState(1);
        const replaced = reduceDomain(state, {
            type: 'state/replace',
            payload: { state: fresh },
        });
        expect(replaced.tasks).toEqual({});
    });
    it('covers project update/archive, repeat cfg update, note bookmark remove', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'project/add',
            payload: {
                project: {
                    id: 'p1',
                    title: 'P',
                    color: 'red',
                    icon: 'folder',
                    archived: false,
                    createdAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'project/update',
            payload: { id: 'p1', patch: { title: 'P2' } },
        });
        expect(state.projects.p1?.title).toBe('P2');
        state = reduceDomain(state, {
            type: 'project/archive',
            payload: { id: 'p1', archived: true },
        });
        expect(state.projects.p1?.archived).toBe(true);
        state = reduceDomain(state, {
            type: 'repeatCfg/add',
            payload: { cfg: counterCfg() },
        });
        state = reduceDomain(state, {
            type: 'repeatCfg/update',
            payload: { id: 'cfg-daily', patch: { repeatEvery: 2 } },
        });
        expect(state.taskRepeatCfgs['cfg-daily']?.repeatEvery).toBe(2);
        state = reduceDomain(state, {
            type: 'note/add',
            payload: {
                note: {
                    id: 'n1',
                    projectId: 'inbox',
                    content: '',
                    bookmarks: [],
                    attachments: [],
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'note-bookmark/add',
            payload: {
                noteId: 'n1',
                bookmark: { id: 'bm1', noteId: 'n1', path: 'a', createdAt: 1, modifiedAt: 1 },
            },
        });
        state = reduceDomain(state, {
            type: 'note-bookmark/remove',
            payload: { noteId: 'n1', bookmarkId: 'bm1' },
        });
        expect(state.notes.n1?.bookmarks).toEqual([]);
    });
    it('covers worklog add/update/remove and tracked entry removal', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'worklog/add',
            payload: {
                entry: {
                    id: 'w1',
                    started: 1,
                    ended: 2,
                    duration: 1,
                    date: '2026-07-20',
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'worklog/update',
            payload: { id: 'w1', patch: { notes: 'n' } },
        });
        expect(state.worklogs.w1?.notes).toBe('n');
        state = reduceDomain(state, { type: 'worklog/remove', payload: { id: 'w1' } });
        expect(state.worklogs.w1).toBeUndefined();
        state = reduceDomain(state, {
            type: 'session/manual',
            payload: {
                entry: {
                    id: 'm1',
                    mode: 'stopwatch',
                    startedAt: 1,
                    endedAt: 2,
                    durationMs: 1,
                    source: 'manual',
                    updatedAt: 2,
                },
            },
        });
        state = reduceDomain(state, { type: 'session/remove', payload: { id: 'm1' } });
        expect(state.trackedEntries.m1).toBeUndefined();
    });
    it('covers counter update/remove, work context update/remove/focus, smart list update/remove, history remove', () => {
        let state = createInitialState(1);
        state = reduceDomain(state, {
            type: 'counter/add',
            payload: {
                counter: {
                    id: 'c1',
                    title: 'C',
                    counterType: 'STOPWATCH',
                    counterOn: false,
                    counterValue: 0,
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'counter/update',
            payload: { id: 'c1', patch: { title: 'C2' } },
        });
        expect(state.counters.c1?.title).toBe('C2');
        state = reduceDomain(state, { type: 'counter/remove', payload: { id: 'c1' } });
        expect(state.counters.c1).toBeUndefined();
        state = reduceDomain(state, {
            type: 'workcontext/focus',
            payload: { id: 'default' },
        });
        expect(state.focusedWorkContextId).toBe('default');
        state = reduceDomain(state, {
            type: 'workcontext/update',
            payload: { id: 'default', patch: { title: 'Home' } },
        });
        expect(state.workContexts.default?.title).toBe('Home');
        state = reduceDomain(state, {
            type: 'workcontext/remove',
            payload: { id: 'default' },
        });
        expect(state.workContexts.default).toBeUndefined();
        expect(state.activeWorkContextId).toBeUndefined();
        state = reduceDomain(state, {
            type: 'smartList/add',
            payload: {
                list: {
                    id: 'sl1',
                    title: 'L',
                    order: 0,
                    listConfig: { isShowCompletedTasks: false, filterCriteria: [] },
                    createdAt: 1,
                    modifiedAt: 1,
                },
            },
        });
        state = reduceDomain(state, {
            type: 'smartList/update',
            payload: { id: 'sl1', patch: { title: 'L2' } },
        });
        expect(state.smartLists.sl1?.title).toBe('L2');
        state = reduceDomain(state, { type: 'smartList/remove', payload: { id: 'sl1' } });
        expect(state.smartLists.sl1).toBeUndefined();
        state = reduceDomain(state, {
            type: 'history/record',
            payload: {
                entry: {
                    id: 'h1',
                    date: '2026-07-20',
                    totalTimeSpent: 0,
                    totalTimeEstimate: 0,
                    tasksDone: 0,
                    resets: 0,
                    createdAt: 1,
                },
            },
        });
        state = reduceDomain(state, { type: 'history/remove', payload: { id: 'h1' } });
        expect(state.history.h1).toBeUndefined();
    });
});
