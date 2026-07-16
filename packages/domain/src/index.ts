export type EntityId = string;
export type ISODate = `${number}-${number}-${number}`;

export type TaskStatus = 'open' | 'done' | 'archived';
export type TaskPriority = 0 | 1 | 2 | 3;

export interface ChecklistItem {
  id: EntityId;
  title: string;
  done: boolean;
}

export interface Attachment {
  id: EntityId;
  name: string;
  mimeType: string;
  size: number;
  localPath?: string;
  url?: string;
}

export interface IssueRef {
  providerId: string;
  issueId: string;
  key: string;
  url: string;
}

export interface Task {
  id: EntityId;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: EntityId;
  parentId?: EntityId;
  tagIds: EntityId[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  issue?: IssueRef;
  dueDay?: ISODate;
  dueAt?: string;
  repeatRule?: string;
  reminderAt?: string;
  estimateMs: number;
  trackedMs: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  order: number;
}

export interface Project {
  id: EntityId;
  title: string;
  color: string;
  icon: string;
  archived: boolean;
  createdAt: number;
}

export interface Tag {
  id: EntityId;
  title: string;
  color: string;
}

export interface TimeSession {
  id: EntityId;
  taskId?: EntityId;
  mode: 'pomodoro' | 'flowtime' | 'stopwatch';
  startedAt: number;
  endedAt?: number;
  durationMs: number;
}

export interface DomainState {
  schemaVersion: 1;
  tasks: Record<EntityId, Task>;
  projects: Record<EntityId, Project>;
  tags: Record<EntityId, Tag>;
  sessions: Record<EntityId, TimeSession>;
  taskOrder: EntityId[];
  selectedTaskId?: EntityId;
  activeProjectId: EntityId;
  activeSessionId?: EntityId;
}

export type DomainCommand =
  | { type: 'task/add'; payload: { task: Task } }
  | { type: 'task/update'; payload: { id: EntityId; patch: Partial<Omit<Task, 'id'>> } }
  | { type: 'task/toggle'; payload: { id: EntityId; completedAt: number } }
  | { type: 'task/remove'; payload: { id: EntityId } }
  | { type: 'task/reorder'; payload: { ids: EntityId[] } }
  | { type: 'task/select'; payload: { id?: EntityId } }
  | { type: 'project/add'; payload: { project: Project } }
  | { type: 'project/select'; payload: { id: EntityId } }
  | { type: 'session/start'; payload: { session: TimeSession } }
  | {
      type: 'session/stop';
      payload: { id: EntityId; endedAt: number; durationMs: number };
    }
  | { type: 'state/replace'; payload: { state: DomainState } };

export interface DomainOperation {
  id: EntityId;
  clientId: EntityId;
  sequence: number;
  timestamp: number;
  command: DomainCommand;
  source: 'local' | 'remote' | 'replay' | 'import';
}

export interface ClockPort {
  now(): number;
  today(): ISODate;
}

export const INBOX_PROJECT_ID = 'inbox';

export const createInitialState = (now = Date.now()): DomainState => ({
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

export const reduceDomain = (state: DomainState, command: DomainCommand): DomainState => {
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
      if (!current) return state;
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
      if (!current) return state;
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
        selectedTaskId:
          state.selectedTaskId === command.payload.id ? undefined : state.selectedTaskId,
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
      if (!session) return state;
      const task = session.taskId ? state.tasks[session.taskId] : undefined;
      return {
        ...state,
        tasks: task
          ? {
              ...state.tasks,
              [task.id]: {
                ...task,
                trackedMs: task.trackedMs + command.payload.durationMs,
                updatedAt: command.payload.endedAt,
              },
            }
          : state.tasks,
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

export const selectOrderedTasks = (state: DomainState): Task[] =>
  state.taskOrder
    .map((id) => state.tasks[id])
    .filter((task): task is Task => Boolean(task));

type LegacyEntityState = {
  ids?: unknown[];
  entities?: Record<string, Record<string, unknown> | undefined>;
};
type LegacyBackupData = Record<string, unknown> & {
  task?: LegacyEntityState;
  project?: LegacyEntityState;
  tag?: LegacyEntityState;
  archiveYoung?: { task?: LegacyEntityState };
  archiveOld?: { task?: LegacyEntityState };
};

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const numberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
const entityValues = (state?: LegacyEntityState): Record<string, unknown>[] =>
  Object.values(state?.entities ?? {}).filter(
    (entity): entity is Record<string, unknown> => Boolean(entity),
  );

/** Converts a Super Productivity complete backup (wrapper or raw data) into Noura's plugin-free state. */
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
  const projects: Record<string, Project> = { ...initial.projects };
  for (const legacy of entityValues(data.project)) {
    const legacyId = stringValue(legacy.id);
    if (!legacyId) continue;
    const id = projectIdMap.get(legacyId) ?? legacyId;
    projectIdMap.set(legacyId, id);
    projects[id] = {
      id,
      title: stringValue(
        legacy.title,
        id === INBOX_PROJECT_ID ? 'Inbox' : 'Untitled project',
      ),
      color: stringValue(
        (legacy.theme as Record<string, unknown> | undefined)?.primary,
        'neutral',
      ),
      icon: stringValue(legacy.icon, id === INBOX_PROJECT_ID ? 'inbox' : 'folder'),
      archived: Boolean(legacy.isArchived),
      createdAt: numberValue(legacy.created, now),
    };
  }

  const tags: Record<string, Tag> = {};
  for (const legacy of entityValues(data.tag)) {
    const id = stringValue(legacy.id);
    if (!id || id === 'TODAY') continue;
    tags[id] = {
      id,
      title: stringValue(legacy.title, id),
      color: stringValue(
        (legacy.theme as Record<string, unknown> | undefined)?.primary,
        'neutral',
      ),
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
  const tasks: Record<string, Task> = {};
  for (const [fallbackId, legacyValue] of Object.entries(legacyTasks)) {
    if (!legacyValue) continue;
    const legacy = legacyValue as Record<string, unknown>;
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
      priority: Math.min(3, Math.max(0, numberValue(legacy.priority))) as TaskPriority,
      projectId: projectIdMap.get(rawProjectId) ?? rawProjectId,
      parentId: stringValue(legacy.parentId) || undefined,
      tagIds: stringArray(legacy.tagIds).filter((id) => id !== 'TODAY'),
      checklist: stringArray(legacy.subTaskIds).map((childId) => ({
        id: childId,
        title: stringValue(
          (legacyTasks[childId] as Record<string, unknown> | undefined)?.title,
          childId,
        ),
        done: Boolean(
          (legacyTasks[childId] as Record<string, unknown> | undefined)?.isDone,
        ),
      })),
      attachments: attachments.map((attachment, index) => {
        const value = (
          attachment && typeof attachment === 'object' ? attachment : {}
        ) as Record<string, unknown>;
        return {
          id: stringValue(value.id, `${id}-attachment-${index}`),
          name: stringValue(value.name, 'Attachment'),
          mimeType: stringValue(value.mimeType, 'application/octet-stream'),
          size: numberValue(value.size),
          localPath: stringValue(value.path) || undefined,
          url: stringValue(value.url) || undefined,
        };
      }),
      issue:
        issueId && providerId
          ? {
              providerId,
              issueId,
              key: stringValue(legacy.issueKey, issueId),
              url: stringValue(legacy.issueUrl),
            }
          : undefined,
      dueDay: (stringValue(legacy.dueDay) as ISODate) || undefined,
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
