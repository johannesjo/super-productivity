export const INBOX_PROJECT_ID = 'inbox';
export const createInitialState = (now = Date.now()) => ({
    schemaVersion: 1,
    tasks: {},
    projects: {
        [INBOX_PROJECT_ID]: {
            id: INBOX_PROJECT_ID,
            title: 'Inbox',
            color: 'neutral',
            icon: 'inbox',
            archived: false,
            createdAt: now,
        },
    },
    tags: {},
    sessions: {},
    taskOrder: [],
    activeProjectId: INBOX_PROJECT_ID,
});
export const reduceDomain = (state, command) => {
    switch (command.type) {
        case 'task/add':
            return {
                ...state,
                tasks: { ...state.tasks, [command.payload.task.id]: command.payload.task },
                taskOrder: [...state.taskOrder, command.payload.task.id],
                selectedTaskId: command.payload.task.id,
            };
        case 'task/update': {
            const current = state.tasks[command.payload.id];
            if (!current)
                return state;
            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [current.id]: { ...current, ...command.payload.patch },
                },
            };
        }
        case 'task/toggle': {
            const current = state.tasks[command.payload.id];
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
                        completedAt: done ? command.payload.completedAt : undefined,
                        updatedAt: command.payload.completedAt,
                    },
                },
            };
        }
        case 'task/remove': {
            const tasks = { ...state.tasks };
            delete tasks[command.payload.id];
            return {
                ...state,
                tasks,
                taskOrder: state.taskOrder.filter((id) => id !== command.payload.id),
                selectedTaskId: state.selectedTaskId === command.payload.id ? undefined : state.selectedTaskId,
            };
        }
        case 'task/reorder':
            return { ...state, taskOrder: [...command.payload.ids] };
        case 'task/select':
            return { ...state, selectedTaskId: command.payload.id };
        case 'project/add':
            return {
                ...state,
                projects: {
                    ...state.projects,
                    [command.payload.project.id]: command.payload.project,
                },
            };
        case 'project/select':
            return { ...state, activeProjectId: command.payload.id, selectedTaskId: undefined };
        case 'session/start':
            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [command.payload.session.id]: command.payload.session,
                },
                activeSessionId: command.payload.session.id,
            };
        case 'session/stop': {
            const session = state.sessions[command.payload.id];
            if (!session)
                return state;
            return {
                ...state,
                sessions: {
                    ...state.sessions,
                    [session.id]: {
                        ...session,
                        endedAt: command.payload.endedAt,
                        durationMs: command.payload.durationMs,
                    },
                },
                activeSessionId: undefined,
            };
        }
        case 'state/replace':
            return command.payload.state;
    }
};
export const selectOrderedTasks = (state) => state.taskOrder
    .map((id) => state.tasks[id])
    .filter((task) => Boolean(task));
const stringValue = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const numberValue = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const stringArray = (value) => Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : [];
const entityValues = (state) => Object.values(state?.entities ?? {}).filter((entity) => Boolean(entity));
/** Converts a Super Productivity complete backup (wrapper or raw data) into Noura's plugin-free state. */
export const migrateLegacyBackupToNoura = (input, now = Date.now()) => {
    if (!input || typeof input !== 'object')
        throw new Error('Unsupported backup format');
    const root = input;
    const data = (root.data && typeof root.data === 'object' ? root.data : root);
    if (!data.task?.entities || !data.project?.entities)
        throw new Error('Unsupported backup format');
    const initial = createInitialState(now);
    const projectIdMap = new Map([
        ['INBOX_PROJECT', INBOX_PROJECT_ID],
        ['inbox', INBOX_PROJECT_ID],
    ]);
    const projects = { ...initial.projects };
    for (const legacy of entityValues(data.project)) {
        const legacyId = stringValue(legacy.id);
        if (!legacyId)
            continue;
        const id = projectIdMap.get(legacyId) ?? legacyId;
        projectIdMap.set(legacyId, id);
        projects[id] = {
            id,
            title: stringValue(legacy.title, id === INBOX_PROJECT_ID ? 'Inbox' : 'Untitled project'),
            color: stringValue(legacy.theme?.primary, 'neutral'),
            icon: stringValue(legacy.icon, id === INBOX_PROJECT_ID ? 'inbox' : 'folder'),
            archived: Boolean(legacy.isArchived),
            createdAt: numberValue(legacy.created, now),
        };
    }
    const tags = {};
    for (const legacy of entityValues(data.tag)) {
        const id = stringValue(legacy.id);
        if (!id || id === 'TODAY')
            continue;
        tags[id] = {
            id,
            title: stringValue(legacy.title, id),
            color: stringValue(legacy.theme?.primary, 'neutral'),
        };
    }
    const liveIds = stringArray(data.task.ids);
    const youngIds = stringArray(data.archiveYoung?.task?.ids);
    const oldIds = stringArray(data.archiveOld?.task?.ids);
    const orderedIds = [...new Set([...liveIds, ...youngIds, ...oldIds])];
    const legacyTasks = {
        ...(data.archiveOld?.task?.entities ?? {}),
        ...(data.archiveYoung?.task?.entities ?? {}),
        ...(data.task.entities ?? {}),
    };
    const tasks = {};
    for (const [fallbackId, legacyValue] of Object.entries(legacyTasks)) {
        if (!legacyValue)
            continue;
        const legacy = legacyValue;
        const id = stringValue(legacy.id, fallbackId);
        const rawProjectId = stringValue(legacy.projectId, 'INBOX_PROJECT');
        const dueWithTime = numberValue(legacy.dueWithTime);
        const remindAt = numberValue(legacy.remindAt);
        const issueId = stringValue(legacy.issueId);
        const providerId = stringValue(legacy.issueProviderId);
        const attachments = Array.isArray(legacy.attachments) ? legacy.attachments : [];
        tasks[id] = {
            id,
            title: stringValue(legacy.title, 'Untitled task'),
            notes: stringValue(legacy.notes),
            status: Boolean(legacy.isDone) ? 'done' : 'open',
            priority: Math.min(3, Math.max(0, numberValue(legacy.priority))),
            projectId: projectIdMap.get(rawProjectId) ?? rawProjectId,
            parentId: stringValue(legacy.parentId) || undefined,
            tagIds: stringArray(legacy.tagIds).filter((id) => id !== 'TODAY'),
            checklist: stringArray(legacy.subTaskIds).map((childId) => ({
                id: childId,
                title: stringValue(legacyTasks[childId]?.title, childId),
                done: Boolean(legacyTasks[childId]?.isDone),
            })),
            attachments: attachments.map((attachment, index) => {
                const value = (attachment && typeof attachment === 'object' ? attachment : {});
                return {
                    id: stringValue(value.id, `${id}-attachment-${index}`),
                    name: stringValue(value.name, 'Attachment'),
                    mimeType: stringValue(value.mimeType, 'application/octet-stream'),
                    size: numberValue(value.size),
                    localPath: stringValue(value.path) || undefined,
                    url: stringValue(value.url) || undefined,
                };
            }),
            issue: issueId && providerId
                ? {
                    providerId,
                    issueId,
                    key: stringValue(legacy.issueKey, issueId),
                    url: stringValue(legacy.issueUrl),
                }
                : undefined,
            dueDay: stringValue(legacy.dueDay) || undefined,
            dueAt: dueWithTime ? new Date(dueWithTime).toISOString() : undefined,
            repeatRule: stringValue(legacy.repeatCfgId) || undefined,
            reminderAt: remindAt ? new Date(remindAt).toISOString() : undefined,
            estimateMs: numberValue(legacy.timeEstimate),
            trackedMs: numberValue(legacy.timeSpent),
            createdAt: numberValue(legacy.created, now),
            updatedAt: numberValue(legacy.modified, numberValue(legacy.created, now)),
            completedAt: numberValue(legacy.doneOn) || undefined,
            order: orderedIds.indexOf(id) >= 0 ? orderedIds.indexOf(id) : orderedIds.length,
        };
    }
    const taskOrder = [
        ...orderedIds.filter((id) => Boolean(tasks[id])),
        ...Object.keys(tasks).filter((id) => !orderedIds.includes(id)),
    ];
    return { ...initial, projects, tags, tasks, taskOrder };
};
