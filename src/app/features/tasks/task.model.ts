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

export type TaskArchive = EntityState<TaskWithSubTasks>;

export type TimeSpentOnDay = Readonly<TimeSpentOnDayCopy>;

export interface TaskCopy {
  id: string;
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
  _isAdditionalInfoOpen: boolean;
  // 0: show, 1: hide-done tasks, 2: hide all sub tasks
  _showSubTasksMode: ShowSubTasksMode;
  _currentTab: number;
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
  _isAdditionalInfoOpen: false,
  _showSubTasksMode: ShowSubTasksMode.Show,
  _currentTab: 0,
};

