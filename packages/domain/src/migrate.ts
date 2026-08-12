import type {
  DomainState,
  GlobalConfig,
  IssueProviderCfg,
  ISODate,
  Note,
  Project,
  SimpleCounter,
  SmartList,
  Tag,
  Task,
  TaskRepeatCfg,
  WorkContext,
} from './entities';
import {
  createDefaultConfig,
  createDefaultTaskViewConfig,
  createInitialState,
  DEFAULT_WORK_CONTEXT_ID,
  INBOX_PROJECT_ID,
} from './entities';

type LegacyEntityState = {
  ids?: unknown[];
  entities?: Record<string, Record<string, unknown> | undefined>;
};

type LegacyBackupData = Record<string, unknown> & {
  task?: LegacyEntityState;
  project?: LegacyEntityState;
  tag?: LegacyEntityState;
  note?: LegacyEntityState;
  workContext?: LegacyEntityState;
  taskRepeatCfg?: LegacyEntityState;
  simpleCounter?: LegacyEntityState;
  issueProvider?: LegacyEntityState;
  globalConfig?: LegacyEntityState;
  userProfile?: LegacyEntityState;
  smartList?: LegacyEntityState;
  archiveYoung?: { task?: LegacyEntityState };
  archiveOld?: { task?: LegacyEntityState };
};

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const numberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const booleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
const entityValues = (state?: LegacyEntityState): Record<string, unknown>[] =>
  Object.values(state?.entities ?? {}).filter(
    (entity): entity is Record<string, unknown> => Boolean(entity),
  );
const themeColor = (
  entity: Record<string, unknown> | undefined,
  fallback: string,
): string => {
  const theme = entity?.theme as Record<string, unknown> | undefined;
  return typeof theme?.primary === 'string' ? theme.primary : fallback;
};
const isoFromEpoch = (value: number | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;
const dateStrFromEpoch = (value: number | undefined): ISODate | undefined =>
  value ? (new Date(value).toISOString().slice(0, 10) as ISODate) : undefined;
const isISODate = (value: unknown): value is ISODate =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const migrateLegacyBackupToNoura = (
  input: unknown,
  now = Date.now(),
): DomainState => {
  if (!input || typeof input !== 'object') throw new Error('Unsupported backup format');
  const root = input as Record<string, unknown>;
  const data = (
    root.data && typeof root.data === 'object' ? root.data : root
  ) as LegacyBackupData;
  if (!data.task?.entities || !data.project?.entities)
    throw new Error('Unsupported backup format');

  const initial = createInitialState(now);
  const projectIdMap = new Map<string, string>([
    ['INBOX_PROJECT', INBOX_PROJECT_ID],
    ['inbox', INBOX_PROJECT_ID],
  ]);

  // Projects
  const projects: Record<string, Project> = { ...initial.projects };
  for (const legacy of entityValues(data.project)) {
    const legacyId = stringValue(legacy.id);
    if (!legacyId) continue;
    const id = projectIdMap.get(legacyId) ?? legacyId;
    projectIdMap.set(legacyId, id);
    const theme = legacy.theme as Record<string, unknown> | undefined;
    projects[id] = {
      id,
      title: stringValue(
        legacy.title,
        id === INBOX_PROJECT_ID ? 'Inbox' : 'Untitled project',
      ),
      color: stringValue(theme?.primary, id === INBOX_PROJECT_ID ? 'neutral' : 'blue'),
      icon: stringValue(legacy.icon, id === INBOX_PROJECT_ID ? 'inbox' : 'folder'),
      archived: booleanValue(legacy.isArchived),
      theme: theme ? { primary: stringValue(theme.primary, '#3b82f6') } : undefined,
      issueIntegrationCfg: legacy.issueIntegrationCfg,
      taskCfg: legacy.taskCfg,
      createdAt: numberValue(legacy.created, now),
    };
  }

  // Tags
  const tags: Record<string, Tag> = {};
  for (const legacy of entityValues(data.tag)) {
    const id = stringValue(legacy.id);
    if (!id || id === 'TODAY') continue;
    tags[id] = {
      id,
      title: stringValue(legacy.title, id),
      color: themeColor(legacy, 'neutral'),
    };
  }

  // Repeat configs (full recurrence engine entities)
  const taskRepeatCfgs: Record<string, TaskRepeatCfg> = {};
  for (const legacy of entityValues(data.taskRepeatCfg)) {
    const id = stringValue(legacy.id);
    if (!id) continue;
    const cfg = legacy.repeatConfig as Record<string, unknown> | undefined;
    const unit = stringValue(legacy.repeatEveryUnit, 'DAILY');
    taskRepeatCfgs[id] = {
      id,
      title: stringValue(legacy.title, 'Repeat'),
      repeatEvery: Math.max(1, numberValue(legacy.repeatEvery, 1)),
      repeatEveryUnit:
        unit === 'WEEKLY' || unit === 'MONTHLY' || unit === 'YEARLY' ? unit : 'DAILY',
      daysOfWeek: stringArray(cfg?.daysOfWeek).map((day) => Number(day) || 0),
      dayOfMonth: numberValue(cfg?.dayOfMonth) || undefined,
      weekOfMonth: numberValue(cfg?.weekOfMonth) || undefined,
      yearMonth: numberValue(cfg?.yearMonth) || undefined,
      repeatOffset: numberValue(cfg?.repeatOffset, 0),
      startDate: isISODate(legacy.startDate) ? legacy.startDate : undefined,
      endDate: isISODate(legacy.endDate) ? legacy.endDate : undefined,
      lastDay: isISODate(legacy.lastDay) ? legacy.lastDay : undefined,
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Notes
  const notes: Record<string, Note> = {};
  for (const legacy of entityValues(data.note)) {
    const id = stringValue(legacy.id);
    if (!id) continue;
    const bookmarks = stringArray(
      (legacy.bookmarks as { ids?: unknown[] } | undefined)?.ids,
    );
    const bookmarkEntities = (
      legacy.bookmarks as { entities?: Record<string, unknown> } | undefined
    )?.entities as Record<string, Record<string, unknown>> | undefined;
    notes[id] = {
      id,
      projectId:
        projectIdMap.get(stringValue(legacy.projectId)) ?? stringValue(legacy.projectId),
      content: stringValue(legacy.content),
      bookmarks: bookmarks
        .filter((bookmarkId) => Boolean(bookmarkEntities?.[bookmarkId]))
        .map((bookmarkId) => {
          const bookmark = (bookmarkEntities?.[bookmarkId] ?? {}) as Record<
            string,
            unknown
          >;
          return {
            id: stringValue(bookmark.id, bookmarkId),
            noteId: stringValue(bookmark.noteId, id),
            path: stringValue(bookmark.path),
            createdAt: numberValue(bookmark.created, now),
            modifiedAt: numberValue(bookmark.modified, now),
          };
        }),
      attachments: [],
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Work contexts
  const workContexts: Record<string, WorkContext> = { ...initial.workContexts };
  const workContextIdMap = new Map<string, string>([
    ['DEFAULT', DEFAULT_WORK_CONTEXT_ID],
  ]);
  for (const legacy of entityValues(data.workContext)) {
    const legacyId = stringValue(legacy.id);
    if (!legacyId) continue;
    const id = workContextIdMap.get(legacyId) ?? legacyId;
    workContextIdMap.set(legacyId, id);
    workContexts[id] = {
      id,
      title: stringValue(legacy.title, id),
      icon: stringValue(legacy.icon, 'briefcase'),
      isEnabled: booleanValue(legacy.isEnabled, true),
      isPersistent: booleanValue(legacy.isPersistent, true),
      taskIds: stringArray(legacy.taskIds),
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Simple counters
  const counters: Record<string, SimpleCounter> = {};
  for (const legacy of entityValues(data.simpleCounter)) {
    const id = stringValue(legacy.id);
    if (!id) continue;
    counters[id] = {
      id,
      title: stringValue(legacy.title, 'Counter'),
      counterType: legacy.counterType === 'COUNTER' ? 'COUNTER' : 'STOPWATCH',
      counterOn: booleanValue(legacy.startedAt !== undefined),
      startedOn: dateStrFromEpoch(numberValue(legacy.startedAt)) || undefined,
      startedAt: numberValue(legacy.startedAt) || undefined,
      counterValue: numberValue(legacy.counterValue, 0),
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Issue providers
  const issueProviders: Record<string, IssueProviderCfg> = {};
  for (const legacy of entityValues(data.issueProvider)) {
    const id = stringValue(legacy.id);
    const providerId = stringValue(legacy.providerId);
    if (!id && !providerId) continue;
    const cfg = legacy.cfg as Record<string, unknown> | undefined;
    const resolvedId = id || providerId;
    issueProviders[resolvedId] = {
      id: resolvedId,
      providerId: providerId || resolvedId,
      cfg: {
        apiHost: stringValue(cfg?.apiHost) || undefined,
        userName: stringValue(cfg?.userName) || undefined,
        hasPassword: stringValue(cfg?.password).length > 0,
      },
      enabled: booleanValue(legacy.enabled, true),
      isNotifyOnNewIssueToMe: booleanValue(legacy.isNotifyOnNewIssueToMe),
      isShowIssueId: booleanValue(legacy.isShowIssueId, true),
      isShowTimeTracking: booleanValue(legacy.isShowTimeTracking, true),
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Global config + user profile
  const config: GlobalConfig = mapConfig(data, now);

  // Smart lists
  const smartLists: Record<string, SmartList> = {};
  for (const legacy of entityValues(data.smartList)) {
    const id = stringValue(legacy.id);
    if (!id) continue;
    const listConfig = legacy.listConfig as
      { isShowCompletedTasks?: unknown; filterCriteria?: unknown } | undefined;
    const rawCriteria = Array.isArray(listConfig?.filterCriteria)
      ? (listConfig?.filterCriteria as Array<Record<string, unknown>>)
      : [];
    smartLists[id] = {
      id,
      title: stringValue(legacy.title, id),
      order: numberValue(legacy.order, 0),
      listConfig: {
        isShowCompletedTasks: booleanValue(listConfig?.isShowCompletedTasks),
        filterCriteria: rawCriteria
          .map((raw) => ({
            type: (stringValue(raw.key) ||
              stringValue(
                raw.type,
              )) as SmartList['listConfig']['filterCriteria'][number]['type'],
            value: stringValue(raw.value),
          }))
          .filter((criteria) =>
            [
              'DUE',
              'PRIORITY',
              'PROJECT',
              'TAG',
              'TIME_ESTIMATE',
              'TEXT',
              'IS_DONE',
            ].includes(criteria.type),
          ),
      },
      createdAt: numberValue(legacy.created, now),
      modifiedAt: numberValue(legacy.modified, now),
    };
  }

  // Tasks: live + archived young/old, with nested subtask trees
  const liveIds = stringArray(data.task.ids);
  const youngIds = stringArray(data.archiveYoung?.task?.ids);
  const oldIds = stringArray(data.archiveOld?.task?.ids);
  const orderedIds = [...new Set([...liveIds, ...youngIds, ...oldIds])];
  const legacyTasks = {
    ...(data.archiveOld?.task?.entities ?? {}),
    ...(data.archiveYoung?.task?.entities ?? {}),
    ...(data.task.entities ?? {}),
  };

  const tasks: Record<string, Task> = {};
  const remindByTaskId = new Map<string, string | undefined>();

  for (const [fallbackId, legacyValue] of Object.entries(legacyTasks)) {
    if (!legacyValue) continue;
    const legacy = legacyValue as Record<string, unknown>;
    const id = stringValue(legacy.id, fallbackId);
    const rawProjectId = stringValue(legacy.projectId, 'INBOX_PROJECT');
    const issueId = stringValue(legacy.issueId);
    const providerId = stringValue(legacy.issueProviderId);

    // Reminders resolution: reminderAt is only meaningful while reminderActive.
    const remindEpoch = numberValue(legacy.remindAt);
    const reminderActive = booleanValue(legacy.reminderActive, true);
    const reminderAt =
      reminderActive && remindEpoch ? new Date(remindEpoch).toISOString() : undefined;
    remindByTaskId.set(id, reminderAt);

    const rawAttachments = Array.isArray(legacy.attachments) ? legacy.attachments : [];
    const attachmentOf = (value: unknown, index: number) => {
      const attachment = (value && typeof value === 'object' ? value : {}) as Record<
        string,
        unknown
      >;
      const localPath = stringValue(attachment.path) || undefined;
      const url = stringValue(attachment.url) || localPath;
      return {
        id: stringValue(attachment.id, `${id}-attachment-${index}`),
        name: stringValue(attachment.name, 'Attachment'),
        mimeType: stringValue(attachment.mimeType, 'application/octet-stream'),
        size: numberValue(attachment.size),
        localPath,
        url,
      };
    };

    tasks[id] = {
      id,
      title: stringValue(legacy.title, 'Untitled task'),
      notes: stringValue(legacy.notes),
      status: legacy.isDone === true ? 'done' : 'open',
      priority: Math.min(
        3,
        Math.max(0, numberValue(legacy.priority)),
      ) as Task['priority'],
      projectId: projectIdMap.get(rawProjectId) ?? rawProjectId,
      parentId: stringValue(legacy.parentId) || undefined,
      subtaskIds: stringArray(legacy.subTaskIds),
      tagIds: stringArray(legacy.tagIds).filter((tagId) => tagId !== 'TODAY'),
      checklist: [],
      sections: [],
      attachments: rawAttachments.map(attachmentOf),
      issue:
        issueId && providerId
          ? {
              providerId,
              issueId,
              key: stringValue(legacy.issueKey, issueId),
              url: stringValue(legacy.issueUrl),
            }
          : undefined,
      dueDay: isISODate(legacy.dueDay) ? legacy.dueDay : undefined,
      dueAt: isoFromEpoch(numberValue(legacy.dueDate)),
      start: dateStrFromEpoch(numberValue(legacy.start)) || undefined,
      startAt: isoFromEpoch(numberValue(legacy.start)) || undefined,
      repeatCfgId: stringValue(legacy.repeatCfgId) || undefined,
      repeatRule: undefined,
      reminderAt,
      estimateMs: numberValue(legacy.timeEstimate, 0),
      trackedMs: numberValue(legacy.timeSpent, 0),
      createdAt: numberValue(legacy.created, now),
      updatedAt: numberValue(legacy.modified, numberValue(legacy.created, now)),
      doneOn: numberValue(legacy.doneOn, 0) || undefined,
      order: 0,
    };
  }

  // Keep tasks whose repeated occurrence config now resolves to a real entity.
  for (const task of Object.values(tasks)) {
    if (task.repeatCfgId && taskRepeatCfgs[task.repeatCfgId]) {
      task.repeatRule = taskRepeatCfgs[task.repeatCfgId].title;
    } else {
      task.repeatCfgId = undefined;
    }
  }

  // Reconcile subtask tree: only keep edges whose parent/child both survived,
  // and link children that a parent misses.
  for (const task of Object.values(tasks)) {
    task.subtaskIds = task.subtaskIds.filter(
      (childId) => Boolean(tasks[childId]) && tasks[childId]?.parentId === task.id,
    );
  }
  // Tasks that are children but unreferenced by a parent's subtaskIds get linked.
  for (const task of Object.values(tasks)) {
    if (!task.parentId) continue;
    const parent = tasks[task.parentId];
    if (parent && !parent.subtaskIds.includes(task.id)) {
      parent.subtaskIds = [...parent.subtaskIds, task.id];
    }
  }

  const taskOrder = [
    ...orderedIds.filter((id) => Boolean(tasks[id])),
    ...Object.keys(tasks).filter((id) => !orderedIds.includes(id)),
  ];
  for (let index = 0; index < taskOrder.length; index += 1) {
    const id = taskOrder[index];
    if (tasks[id]) tasks[id].order = index;
  }

  // Archived young/old buckets are stored as task status transitions.
  for (const legacy of [
    ...entityValues(data.archiveYoung?.task),
    ...entityValues(data.archiveOld?.task),
  ]) {
    const id = stringValue(legacy.id);
    const task = tasks[id];
    if (task && (legacy.isDone === true || booleanValue(legacy.isArchived))) {
      task.status = 'archived';
      task.doneOn = numberValue(legacy.doneOn, 0) || task.doneOn;
    }
  }

  const activeWorkContextId =
    Object.values(workContexts).find((context) => context.isEnabled)?.id ??
    DEFAULT_WORK_CONTEXT_ID;

  const taskViewConfigs = {
    today: createDefaultTaskViewConfig('today', now),
    upcoming: createDefaultTaskViewConfig('upcoming', now),
    inbox: createDefaultTaskViewConfig('inbox', now),
  };

  return {
    ...initial,
    schemaVersion: 2,
    projects,
    tags,
    tasks,
    taskRepeatCfgs,
    notes,
    worklogs: {},
    counters,
    workContexts,
    issueProviders,
    taskViewConfigs,
    smartLists,
    history: {},
    archives: {},
    config,
    taskOrder,
    activeProjectId: initial.activeProjectId,
    activeWorkContextId,
  };
};

const mapConfig = (data: LegacyBackupData, now: number): GlobalConfig => {
  const global = entityValues(data.globalConfig)[0] ?? {};
  const profile = entityValues(data.userProfile)[0] ?? {};
  const all = { ...global, ...profile };
  const weekStartRaw = numberValue(all.weekStartDay, 1);
  return {
    ...createDefaultConfig(now),
    id: 'cfg',
    language: stringValue(all.language, 'en'),
    dateFormat: stringValue(all.dateFormat, 'MM/DD/YYYY'),
    timeFormat: stringValue(all.timeFormat, 'HH:mm'),
    weekStartDay: weeklyStart(weekStartRaw),
    isEnableReminders: booleanValue(all.isEnableReminders, true),
    isEnableTrackingReminder: booleanValue(all.isEnableTrackingReminder, true),
    trackingReminderMinute: numberValue(all.trackingReminderMinute, 45),
  };
};

const weeklyStart = (value: number): number => {
  if (value === 0 || value === 7) return 1; // Sunday treat as Monday for week start
  return value >= 1 && value <= 6 ? value : 1;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? (value as Record<string, any>) : {};

/**
 * Migrates a persisted Noura DomainState (schemaVersion 1) to the current
 * schema (version 2): adds the new collections, moves `sessions` into
 * `trackedEntries`, upgrades TrackedEntry fields, and backfills config.
 * Unknown documents are rejected; anything recognizing as an object with tasks
 * and projects is normalized so stale stores remain loadable.
 */
export const migrateDomainState = (input: unknown): DomainState => {
  if (!input || typeof input !== 'object') throw new Error('Unsupported backup format');
  const raw = asRecord(input);
  if (!raw.tasks || !raw.projects) throw new Error('Unsupported backup format');
  const previous = raw as Record<string, unknown>;

  const initial = createInitialState(Date.now());
  const sessions = asRecord(previous.sessions ?? {});

  const migratedTasks: Record<string, Task> = {};
  for (const [id, value] of Object.entries(asRecord(previous.tasks))) {
    const task = asRecord(value);
    if (!task.id) continue;
    const migrated: Task = {
      ...(task as unknown as Task),
      subtaskIds: Array.isArray(task.subtaskIds) ? task.subtaskIds : [],
      sections: Array.isArray(task.sections) ? task.sections : [],
      repeatCfgId: task.repeatCfgId,
      start: task.start,
      startAt: task.startAt,
      doneOn: task.doneOn ?? (task.completedAt ? task.completedAt : undefined),
      updatedAt: numberValue(task.updatedAt, Date.now()),
    };
    migratedTasks[id] = migrated;
  }

  const trackedEntries: DomainState['trackedEntries'] = {};
  for (const [id, value] of Object.entries(sessions)) {
    const session = asRecord(value);
    if (!session.id) continue;
    trackedEntries[id] = {
      id,
      taskId: stringValue(session.taskId) || undefined,
      mode:
        session.mode === 'flowtime' || session.mode === 'stopwatch'
          ? session.mode
          : 'pomodoro',
      startedAt: numberValue(session.startedAt, Date.now()),
      endedAt: numberValue(session.endedAt) || undefined,
      durationMs: numberValue(session.durationMs, 0),
      source: 'timer',
      updatedAt: numberValue(session.endedAt, numberValue(session.startedAt, Date.now())),
    };
  }

  return {
    schemaVersion: 2,
    tasks: migratedTasks,
    projects: asRecord(previous.projects) as DomainState['projects'],
    tags: asRecord(previous.tags) as DomainState['tags'],
    trackedEntries,
    taskRepeatCfgs: asRecord(
      previous.taskRepeatCfgs ?? {},
    ) as DomainState['taskRepeatCfgs'],
    notes: asRecord(previous.notes ?? {}) as DomainState['notes'],
    worklogs: asRecord(previous.worklogs ?? {}) as DomainState['worklogs'],
    counters: asRecord(previous.counters ?? {}) as DomainState['counters'],
    workContexts: {
      ...initial.workContexts,
      ...(asRecord(previous.workContexts ?? {}) as DomainState['workContexts']),
    },
    issueProviders: asRecord(
      previous.issueProviders ?? {},
    ) as DomainState['issueProviders'],
    taskViewConfigs: asRecord(
      previous.taskViewConfigs ?? {},
    ) as DomainState['taskViewConfigs'],
    smartLists: asRecord(previous.smartLists ?? {}) as DomainState['smartLists'],
    history: asRecord(previous.history ?? {}) as DomainState['history'],
    archives: asRecord(previous.archives ?? {}) as DomainState['archives'],
    config: { ...initial.config, ...(asRecord(previous.config ?? {}) as GlobalConfig) },
    taskOrder: Array.isArray(previous.taskOrder) ? (previous.taskOrder as string[]) : [],
    selectedTaskId: stringValue(previous.selectedTaskId) || undefined,
    activeProjectId: stringValue(previous.activeProjectId, INBOX_PROJECT_ID),
    activeWorkContextId:
      stringValue(previous.activeWorkContextId) || DEFAULT_WORK_CONTEXT_ID,
    focusedWorkContextId: stringValue(previous.focusedWorkContextId) || undefined,
    activeSessionId: stringValue(previous.activeSessionId) || undefined,
  };
};

/** Tries a legacy backup first, then migrates an existing Noura state. */
export const importAnyState = (input: unknown): DomainState => {
  if (!input || typeof input !== 'object') throw new Error('Unsupported backup format');
  const candidate = asRecord(input);
  if (candidate.state && typeof candidate.state === 'object') {
    return importAnyState(candidate.state);
  }
  if (candidate.schemaVersion === 1 && candidate.tasks && candidate.projects) {
    return migrateDomainState(candidate);
  }
  if (candidate.schemaVersion === 2 && candidate.tasks && candidate.projects) {
    return candidate as unknown as DomainState;
  }
  return migrateLegacyBackupToNoura(input);
};
