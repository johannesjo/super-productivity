import { IssueProviderKey } from '../issue/issue.model';
import { Reminder } from '../reminder/reminder.model';
import { EntityState } from '@ngrx/entity';
import { TaskAttachment } from './task-attachment/task-attachment.model';
import { MODEL_VERSION_KEY } from '../../app.constants';

export enum HideSubTasksMode {
  // Show is undefined
  HideDone = 1,
  HideAll = 2,
}

export enum TaskDetailTargetPanel {
  Default = 'Default',
  Attachments = 'Attachments',
  DONT_OPEN_PANEL = 'DONT_OPEN_PANEL',
}

export type DropListModelSource =
  | 'UNDONE'
  | 'DONE'
  | 'BACKLOG'
  | 'ADD_TASK_PANEL'
  | 'OVERDUE';

// NOTE: do not change these, as they are used inside task repeat model directly
// (new can be added though)
export enum TaskReminderOptionId {
  DoNotRemind = 'DoNotRemind',
  AtStart = 'AtStart',
  m5 = 'm5',
  m10 = 'm10',
  m15 = 'm15',
  m30 = 'm30',
  h1 = 'h1',
}

export interface TaskReminderOption {
  value: TaskReminderOptionId;
  label: string;
}

export interface TimeSpentOnDayCopy {
  [key: string]: number;
}

export interface TaskArchive extends EntityState<ArchiveTask> {
  ids: string[];
  // additional entities state properties
  [MODEL_VERSION_KEY]?: number;
}

export type TimeSpentOnDay = Readonly<TimeSpentOnDayCopy>;

export interface IssueTaskTimeTracked {
  [key: string]: number;
}

export interface IssueFieldsForTask {
  // NOTE: keep in mind that the issueId is not unique (especially for github)
  issueId?: string;
  issueProviderId?: string;
  issueType?: IssueProviderKey;
  issueWasUpdated?: boolean;
  issueLastUpdated?: number;
  issueAttachmentNr?: number;
  issueTimeTracked?: IssueTaskTimeTracked;
  issuePoints?: number;
}

export interface TaskCopy extends IssueFieldsForTask {
  id: string;
  projectId: string;
  title: string;

  subTaskIds: string[];

  timeSpentOnDay: TimeSpentOnDay;
  timeEstimate: number;
  timeSpent: number;

  notes?: string;

  created: number;
  isDone: boolean;
  doneOn?: number;

  // datetime
  dueWithTime?: number;
  // day only
  dueDay?: string;

  // TODO replace
  hasPlannedTime?: boolean;
  // remindCfg: TaskReminderOptionId;

  parentId?: string;
  reminderId?: string;
  repeatCfgId?: string;
  // NOTE: only main tasks have tagIds set
  tagIds: string[];

  // attachments
  attachments: TaskAttachment[];

  // ui model
  // 0: show, 1: hide-done tasks, 2: hide all sub-tasks
  _hideSubTasksMode?: HideSubTasksMode;
}

/**
 * standard task but with:
 * * reminder removed, if any
 * * sub tasks not included (but copied)
 */
// attachment data saved to it
export type ArchiveTask = Readonly<TaskCopy>;

export type Task = Readonly<TaskCopy>;

export interface TaskWithReminderData extends Task {
  readonly reminderData: Reminder;
  readonly parentData?: Task;
}

export interface TaskWithReminder extends Task {
  reminderId: string;
  dueWithTime: number;
}

export interface TaskWithDueTime extends Task {
  dueWithTime: number;
}

export interface TaskWithDueDay extends Task {
  dueDay: string;
}

export type TaskPlannedWithDayOrTime = TaskWithDueTime | TaskWithDueDay;

export interface TaskWithoutReminder extends Task {
  reminderId: undefined;
  due: undefined;
}

export interface TaskWithPlannedForDayIndication extends TaskWithoutReminder {
  plannedForDay: string;
}

export interface TaskWithSubTasks extends Task {
  readonly subTasks: Task[];
}

export const DEFAULT_TASK: Omit<TaskCopy, 'projectId'> = {
  id: '',
  subTaskIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  title: '',
  tagIds: [],
  created: Date.now(),

  attachments: [],
};

export interface TaskState extends EntityState<Task> {
  // overwrite entity model to avoid problems with typing
  ids: string[];

  // additional entities state properties
  currentTaskId: string | null;
  selectedTaskId: string | null;
  taskDetailTargetPanel?: TaskDetailTargetPanel | null;
  lastCurrentTaskId: string | null;
  isDataLoaded: boolean;

  [MODEL_VERSION_KEY]?: number;
}

export interface WorklogTask extends Task {
  dateStr: string;
}
