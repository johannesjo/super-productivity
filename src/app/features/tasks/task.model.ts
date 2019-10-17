import {IssueData, IssueProviderKey} from '../issue/issue';
import {Reminder} from '../reminder/reminder.model';
import {EntityState} from '@ngrx/entity';

export enum ShowSubTasksMode {
  HideAll = 0,
  HideDone = 1,
  Show = 2,
}

export type DropListModelSource = 'UNDONE' | 'DONE' | 'BACKLOG';

export interface TimeSpentOnDayCopy {
  [key: string]: number;
}

export type TaskArchive = EntityState<TaskWithIssueData>;

export type TimeSpentOnDay = Readonly<TimeSpentOnDayCopy>;

export interface TaskCopy {
  id: string;
  projectId: string;
  title: string;

  subTaskIds: string[];
  timeSpentOnDay: TimeSpentOnDay;
  timeSpent: number;
  timeEstimate: number;

  created: number;
  isDone: boolean;

  notes: string;
  issueId: string;
  issueType: IssueProviderKey;
  parentId: string;
  attachmentIds: string[];
  reminderId?: string;
  repeatCfgId: string;

  // ui model
  ui_isAdditionalInfoOpen: boolean;
  // 0: show, 1: hide-done tasks, 2: hide all sub tasks
  ui_showSubTasksMode: ShowSubTasksMode;
  ui_currentTab: number;
}

export type Task = Readonly<TaskCopy>;

export interface TaskWithIssueData extends Task {
  readonly issueData?: IssueData;
}

export interface TaskWithReminderData extends Task {
  readonly reminderData: Reminder;
}

export interface TaskWithSubTasks extends TaskWithIssueData {
  readonly subTasks?: TaskWithIssueData[];
}


export const DEFAULT_TASK: Task = {
  id: null,
  projectId: null,
  subTaskIds: [],
  attachmentIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  title: '',
  notes: '',
  parentId: null,
  issueId: null,
  issueType: null,
  reminderId: null,
  created: Date.now(),
  repeatCfgId: null,
  ui_isAdditionalInfoOpen: false,
  ui_showSubTasksMode: ShowSubTasksMode.Show,
  ui_currentTab: 0,
};

export const SHORT_SYNTAX_REG_EX = / t?(([0-9]+(m|h|d)+)? *\/ *)?([0-9]+(m|h|d)+) *$/i;

export interface TaskState extends EntityState<Task> {
  // overwrite entity model to avoid problems with typing
  ids: string[];

  // additional entities state properties
  currentTaskId: string | null;
  lastCurrentTaskId: string | null;
  focusTaskId: string | null;
  lastActiveFocusTaskId: string | null;

  // NOTE: but it is not needed currently
  todaysTaskIds: string[];
  backlogTaskIds: string[];
  stateBefore: TaskState;
  isDataLoaded: boolean;

  // TODO though this not so much maybe
  // todayDoneTasks: string[];
  // todayUnDoneTasks: string[];

  // TODO maybe rework time spent updates etc. via
  // BEWARE of the potential cleanup issues though
  // lastDeletedTasks: string[];
  // lastAffectedTasks: string[];
}
