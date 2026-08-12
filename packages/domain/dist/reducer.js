import { createInitialState, createDefaultTaskViewConfig, INBOX_PROJECT_ID, } from './entities';
import { getRepeatConfigNextDate } from './recurrence';
/** All Task fields a repeat rollover clone copies, minus fresh scheduling data. */
const repeatCarryOver = (task) => ({
    ...task,
    id: '',
    status: 'open',
    doneOn: undefined,
    parentId: task.parentId,
    subtaskIds: [],
    checklist: task.checklist.map((item) => ({ ...item, done: false })),
    trackedMs: 0,
    reminderAt: task.reminderAt,
    createdAt: 0,
    updatedAt: 0,
    order: 0,
});
export const reduceDomain = (input, command) => {
    let state = input;
    switch (command.type) {
        case 'task/add':
            return addTask(state, command.payload.task);
        case 'task/update':
            return updateTask(state, command.payload);
        case 'task/toggle':
            return toggleTask(state, command.payload);
        case 'task/remove':
            return removeTask(state, command.payload.id);
        case 'task/reorder':
            return { ...state, taskOrder: [...command.payload.ids] };
        case 'task/select':
            return { ...state, selectedTaskId: command.payload.id };
        case 'task/archive':
            return archiveTask(state, command.payload);
        case 'task/restore':
            return setTaskStatus(state, command.payload.id, 'open', undefined, true);
        case 'task/reset':
            return resetTask(state, command.payload);
        case 'task/link-issue':
            return patchTask(state, command.payload.id, { issue: command.payload.issue });
        case 'task/unlink-issue':
            return patchTask(state, command.payload.id, { issue: undefined });
        case 'task/repeat-rollover':
            return repeatRollover(state, command.payload);
        case 'project/add':
            return addProject(state, command.payload.project);
        case 'project/update':
            return updateProject(state, command.payload);
        case 'project/select':
            return {
                ...state,
                activeProjectId: command.payload.id,
                selectedTaskId: undefined,
            };
        case 'project/archive':
            return updateProject(state, {
                id: command.payload.id,
                patch: { archived: command.payload.archived },
            });
        case 'tag/add':
            return upsertEntity(state, 'tags', command.payload.tag);
        case 'tag/update':
            return updateEntity(state, 'tags', command.payload);
        case 'tag/remove':
            return removeTag(state, command.payload.id);
        case 'repeatCfg/add':
            return upsertEntity(state, 'taskRepeatCfgs', command.payload.cfg);
        case 'repeatCfg/update':
            return updateEntity(state, 'taskRepeatCfgs', command.payload);
        case 'repeatCfg/remove':
            return removeRepeatCfg(state, command.payload.id);
        case 'note/add':
            return upsertEntity(state, 'notes', command.payload.note);
        case 'note/update':
            return updateEntity(state, 'notes', command.payload);
        case 'note/remove':
            return removeEntity(state, 'notes', command.payload.id);
        case 'note-bookmark/add': {
            const note = state.notes[command.payload.noteId];
            if (!note)
                return state;
            return {
                ...state,
                notes: {
                    ...state.notes,
                    [note.id]: {
                        ...note,
                        bookmarks: [...note.bookmarks, command.payload.bookmark],
                        modifiedAt: note.modifiedAt,
                    },
                },
            };
        }
        case 'note-bookmark/remove': {
            const note = state.notes[command.payload.noteId];
            if (!note)
                return state;
            return {
                ...state,
                notes: {
                    ...state.notes,
                    [note.id]: {
                        ...note,
                        bookmarks: note.bookmarks.filter((bookmark) => bookmark.id !== command.payload.bookmarkId),
                    },
                },
            };
        }
        case 'worklog/add':
            return upsertEntity(state, 'worklogs', command.payload.entry);
        case 'worklog/update':
            return updateEntity(state, 'worklogs', command.payload);
        case 'worklog/remove':
            return removeEntity(state, 'worklogs', command.payload.id);
        case 'worklog/from-entry':
            return addWorklogFromEntry(state, command.payload.entry);
        case 'session/start':
            return startEntry(state, command.payload.session);
        case 'session/stop':
            return stopEntry(state, command.payload);
        case 'session/manual':
            return addManualEntry(state, command.payload.entry);
        case 'session/remove':
            return removeEntity(state, 'trackedEntries', command.payload.id);
        case 'counter/add':
            return upsertEntity(state, 'counters', command.payload.counter);
        case 'counter/update':
            return updateEntity(state, 'counters', command.payload);
        case 'counter/toggle':
            return toggleCounter(state, command.payload);
        case 'counter/tick': {
            const counter = state.counters[command.payload.id];
            if (!counter || counter.counterType !== 'COUNTER')
                return state;
            return {
                ...state,
                counters: {
                    ...state.counters,
                    [counter.id]: {
                        ...counter,
                        counterValue: counter.counterValue + command.payload.value,
                        modifiedAt: command.payload.value > 0 ? counter.modifiedAt : counter.modifiedAt,
                    },
                },
            };
        }
        case 'counter/remove':
            return removeEntity(state, 'counters', command.payload.id);
        case 'workcontext/add':
            return upsertEntity(state, 'workContexts', command.payload.context);
        case 'workcontext/update':
            return updateEntity(state, 'workContexts', command.payload);
        case 'workcontext/remove':
            return removeWorkContext(state, command.payload.id);
        case 'workcontext/switch':
            return state.workContexts[command.payload.id]
                ? { ...state, activeWorkContextId: command.payload.id }
                : state;
        case 'workcontext/focus':
            return command.payload.id && state.workContexts[command.payload.id]
                ? { ...state, focusedWorkContextId: command.payload.id }
                : { ...state, focusedWorkContextId: undefined };
        case 'issueProvider/add':
            return upsertEntity(state, 'issueProviders', command.payload.cfg);
        case 'issueProvider/update':
            return updateEntity(state, 'issueProviders', command.payload);
        case 'issueProvider/remove':
            return removeEntity(state, 'issueProviders', command.payload.id);
        case 'config/update':
            return {
                ...state,
                config: { ...state.config, ...command.payload.patch },
            };
        case 'taskView/update': {
            const current = state.taskViewConfigs[command.payload.id];
            if (current) {
                return {
                    ...state,
                    taskViewConfigs: {
                        ...state.taskViewConfigs,
                        [current.id]: { ...current, ...command.payload.patch },
                    },
                };
            }
            const created = {
                ...createDefaultTaskViewConfig(command.payload.id, Date.now()),
                ...command.payload.patch,
            };
            return {
                ...state,
                taskViewConfigs: { ...state.taskViewConfigs, [created.id]: created },
            };
        }
        case 'smartList/add':
            return upsertEntity(state, 'smartLists', command.payload.list);
        case 'smartList/update':
            return updateEntity(state, 'smartLists', command.payload);
        case 'smartList/remove':
            return removeEntity(state, 'smartLists', command.payload.id);
        case 'history/record':
            return upsertEntity(state, 'history', command.payload.entry);
        case 'history/remove':
            return removeEntity(state, 'history', command.payload.id);
        case 'state/replace':
            return command.payload.state;
    }
};
// --- task reducers ---
const addTask = (state, task) => {
    const tasks = { ...state.tasks, [task.id]: task };
    const parent = task.parentId ? state.tasks[task.parentId] : undefined;
    if (parent && parent.id !== task.id) {
        tasks[parent.id] = {
            ...parent,
            subtaskIds: parent.subtaskIds.includes(task.id)
                ? parent.subtaskIds
                : [...parent.subtaskIds, task.id],
        };
    }
    return {
        ...state,
        tasks,
        taskOrder: [...state.taskOrder.filter((id) => id !== task.id), task.id],
        selectedTaskId: task.id,
    };
};
const patchTask = (state, id, patch) => {
    const current = state.tasks[id];
    if (!current)
        return state;
    const next = {
        ...current,
        ...patch,
        id: current.id,
        subtaskIds: patch.subtaskIds ?? current.subtaskIds,
    };
    const tasks = { ...state.tasks, [current.id]: next };
    if (patch.parentId !== undefined && patch.parentId !== current.parentId) {
        const previousParent = current.parentId ? tasks[current.parentId] : undefined;
        if (previousParent) {
            tasks[previousParent.id] = {
                ...previousParent,
                subtaskIds: previousParent.subtaskIds.filter((cid) => cid !== current.id),
            };
        }
        if (patch.parentId) {
            const nextParent = tasks[patch.parentId];
            if (nextParent && nextParent.id !== current.id) {
                tasks[nextParent.id] = {
                    ...nextParent,
                    subtaskIds: nextParent.subtaskIds.includes(current.id)
                        ? nextParent.subtaskIds
                        : [...nextParent.subtaskIds, current.id],
                };
            }
        }
    }
    return { ...state, tasks };
};
const updateTask = (state, payload) => patchTask(state, payload.id, payload.patch);
const toggleTask = (state, payload) => {
    const current = state.tasks[payload.id];
    if (!current)
        return state;
    const done = current.status !== 'done';
    return {
        ...state,
        tasks: {
            ...state.tasks,
            [current.id]: {
                ...current,
                status: done ? 'done' : 'open',
                doneOn: done ? payload.doneOn : undefined,
                updatedAt: payload.doneOn,
            },
        },
    };
};
const removeTask = (state, id) => {
    if (!state.tasks[id])
        return state;
    const descendants = new Set([id]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const task of Object.values(state.tasks)) {
            if (task.parentId && descendants.has(task.parentId) && !descendants.has(task.id)) {
                descendants.add(task.id);
                grew = true;
            }
        }
    }
    const tasks = { ...state.tasks };
    for (const descendantId of descendants)
        delete tasks[descendantId];
    const parent = state.tasks[id]?.parentId ? tasks[state.tasks[id].parentId] : undefined;
    if (parent) {
        tasks[parent.id] = {
            ...parent,
            subtaskIds: parent.subtaskIds.filter((cid) => !descendants.has(cid)),
        };
    }
    const taskOrder = state.taskOrder.filter((tid) => !descendants.has(tid));
    const trackedEntries = { ...state.trackedEntries };
    for (const entry of Object.values(state.trackedEntries)) {
        if (entry.taskId && descendants.has(entry.taskId))
            delete trackedEntries[entry.id];
    }
    return {
        ...state,
        tasks,
        taskOrder,
        trackedEntries,
        selectedTaskId: state.selectedTaskId && descendants.has(state.selectedTaskId)
            ? undefined
            : state.selectedTaskId,
        activeSessionId: state.activeSessionId && trackedEntries[state.activeSessionId]
            ? state.activeSessionId
            : undefined,
    };
};
const archiveTask = (state, payload) => {
    const current = state.tasks[payload.id];
    if (!current)
        return state;
    const archived = {
        ...current,
        status: 'archived',
        doneOn: current.doneOn ?? payload.at,
        updatedAt: payload.at,
    };
    return {
        ...state,
        tasks: { ...state.tasks, [current.id]: archived },
        archives: {
            ...state.archives,
            [current.id]: {
                id: current.id,
                bucket: 'young',
                task: archived,
                archivedOn: payload.at,
            },
        },
    };
};
const setTaskStatus = (state, id, status, doneOn, removeFromArchive) => {
    const current = state.tasks[id];
    if (!current)
        return state;
    const tasks = { ...state.tasks, [current.id]: { ...current, status, doneOn } };
    const archives = { ...state.archives };
    if (removeFromArchive)
        delete archives[id];
    return { ...state, tasks, archives };
};
const resetTask = (state, payload) => {
    const current = state.tasks[payload.id];
    if (!current)
        return state;
    const tasks = {
        ...state.tasks,
        [current.id]: {
            ...current,
            status: 'open',
            doneOn: undefined,
            updatedAt: payload.at,
        },
    };
    const archives = { ...state.archives };
    delete archives[current.id];
    return { ...state, tasks, archives };
};
const repeatRollover = (state, payload) => {
    const current = state.tasks[payload.id];
    if (!current)
        return state;
    const cfg = current.repeatCfgId ? state.taskRepeatCfgs[current.repeatCfgId] : undefined;
    if (!cfg)
        return state;
    const base = current.dueDay ?? cfg.lastDay ?? payload.today;
    const nextDate = getRepeatConfigNextDate(cfg, base);
    if (!nextDate)
        return state;
    const tasks = { ...state.tasks };
    const taskRepeatCfgs = {
        ...state.taskRepeatCfgs,
        [cfg.id]: { ...cfg, lastDay: nextDate },
    };
    const nextId = `${current.id}-${nextDate.replace(/-/g, '')}`;
    const clone = repeatCarryOver(current);
    const nextTask = {
        ...clone,
        id: nextId,
        title: current.title,
        notes: current.notes,
        priority: current.priority,
        projectId: current.projectId,
        tagIds: [...current.tagIds],
        attachments: [...current.attachments],
        sections: current.sections.map((section) => ({ ...section, taskIds: [] })),
        dueDay: nextDate,
        start: current.start,
        reminderAt: current.reminderAt,
        repeatCfgId: cfg.id,
        repeatRule: cfg.title,
        createdAt: cfg.modifiedAt,
        updatedAt: cfg.modifiedAt,
        order: state.taskOrder.length,
    };
    // children travel with the clone only when they are not repeating themselves
    for (const childId of current.subtaskIds) {
        const child = tasks[childId];
        if (child && !child.repeatCfgId) {
            tasks[`${childId}-${nextDate.replace(/-/g, '')}`] = {
                ...child,
                id: `${childId}-${nextDate.replace(/-/g, '')}`,
                parentId: nextTask.id,
                doneOn: undefined,
                trackedMs: 0,
            };
            nextTask.subtaskIds.push(`${childId}-${nextDate.replace(/-/g, '')}`);
        }
    }
    tasks[nextTask.id] = nextTask;
    // Keep the completed original; app layer marks it done before rollover.
    return {
        ...state,
        tasks,
        taskRepeatCfgs,
        taskOrder: [...state.taskOrder, nextTask.id],
    };
};
// --- project / tag / entity helpers ---
const upsertEntity = (state, key, entity) => {
    const map = state[key];
    const value = entity;
    return { ...state, [key]: { ...map, [value.id]: value } };
};
const updateEntity = (state, key, payload) => {
    const map = state[key];
    const current = map[payload.id];
    if (!current)
        return state;
    return {
        ...state,
        [key]: { ...map, [current.id]: { ...current, ...payload.patch } },
    };
};
const removeEntity = (state, key, id) => {
    const map = { ...state[key] };
    delete map[id];
    return { ...state, [key]: map };
};
const addProject = (state, project) => {
    return {
        ...state,
        projects: { ...state.projects, [project.id]: project },
    };
};
const updateProject = (state, payload) => {
    const current = state.projects[payload.id];
    if (!current)
        return state;
    return {
        ...state,
        projects: { ...state.projects, [current.id]: { ...current, ...payload.patch } },
    };
};
const removeTag = (state, id) => {
    if (!state.tags[id])
        return state;
    const tags = { ...state.tags };
    delete tags[id];
    const tasks = { ...state.tasks };
    for (const task of Object.values(tasks)) {
        if (task.tagIds.includes(id))
            tasks[task.id] = { ...task, tagIds: task.tagIds.filter((tid) => tid !== id) };
    }
    return { ...state, tags, tasks };
};
const removeRepeatCfg = (state, id) => {
    if (!state.taskRepeatCfgs[id])
        return state;
    const taskRepeatCfgs = { ...state.taskRepeatCfgs };
    delete taskRepeatCfgs[id];
    const tasks = { ...state.tasks };
    for (const task of Object.values(tasks)) {
        if (task.repeatCfgId === id)
            tasks[task.id] = { ...task, repeatCfgId: undefined };
    }
    return { ...state, taskRepeatCfgs, tasks };
};
const removeWorkContext = (state, id) => {
    if (!state.workContexts[id])
        return state;
    const workContexts = { ...state.workContexts };
    delete workContexts[id];
    return {
        ...state,
        workContexts,
        activeWorkContextId: state.activeWorkContextId === id ? undefined : state.activeWorkContextId,
    };
};
// --- tracked entries / worklog ---
const startEntry = (state, entry) => ({
    ...state,
    trackedEntries: { ...state.trackedEntries, [entry.id]: entry },
    activeSessionId: entry.id,
});
const stopEntry = (state, payload) => {
    const entry = state.trackedEntries[payload.id];
    if (!entry)
        return state;
    const finished = {
        ...entry,
        endedAt: payload.endedAt,
        durationMs: payload.durationMs,
        updatedAt: payload.endedAt,
    };
    return attributeTime(state, entry, finished);
};
const addManualEntry = (state, entry) => attributeTime(state, entry, entry);
const attributeTime = (state, before, after) => {
    const tasks = { ...state.tasks };
    const task = before.taskId ? state.tasks[before.taskId] : undefined;
    if (task) {
        tasks[task.id] = {
            ...task,
            trackedMs: task.trackedMs + after.durationMs,
            updatedAt: after.endedAt ?? after.startedAt,
        };
    }
    return {
        ...state,
        tasks,
        trackedEntries: { ...state.trackedEntries, [before.id]: after },
        activeSessionId: state.activeSessionId === before.id ? undefined : state.activeSessionId,
    };
};
const addWorklogFromEntry = (state, entry) => {
    const createdAt = entry.updatedAt ?? entry.endedAt ?? entry.startedAt;
    const worklog = {
        id: entry.id,
        taskId: entry.taskId,
        started: entry.startedAt,
        ended: entry.endedAt ?? entry.startedAt + entry.durationMs,
        duration: entry.durationMs,
        date: entry.date,
        notes: entry.notes,
        createdAt,
        modifiedAt: createdAt,
    };
    return { ...state, worklogs: { ...state.worklogs, [worklog.id]: worklog } };
};
const toggleCounter = (state, payload) => {
    const counter = state.counters[payload.id];
    if (!counter)
        return state;
    if (counter.counterOn) {
        return {
            ...state,
            counters: {
                ...state.counters,
                [counter.id]: {
                    ...counter,
                    counterOn: false,
                    startedAt: undefined,
                    startedOn: undefined,
                    modifiedAt: payload.at,
                },
            },
        };
    }
    return {
        ...state,
        counters: {
            ...state.counters,
            [counter.id]: {
                ...counter,
                counterOn: true,
                startedAt: payload.at,
                startedOn: new Date(payload.at)
                    .toISOString()
                    .slice(0, 10),
                modifiedAt: payload.at,
            },
        },
    };
};
export { createInitialState, INBOX_PROJECT_ID };
