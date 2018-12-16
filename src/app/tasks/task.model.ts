import { IssueData, IssueProviderKey } from '../issue/issue';

export type DropListModelSource = 'UNDONE' | 'DONE' | 'BACKLOG';

export type TimeSpentOnDay = Readonly<{
  [key: string]: number;
}>;

export interface TaskCopy {
  id: string;
  title: string;

  subTaskIds: string[];
  timeSpentOnDay: TimeSpentOnDay;
  timeSpent: number;
  timeEstimate: number;

  created: number;
  isDone?: boolean;

  notes?: string;
  issueId?: string;
  issueType?: IssueProviderKey;
  parentId?: string;
  attachmentIds: string[];

  // ui model
  _isAdditionalInfoOpen?: boolean;
  _isHideSubTasks?: boolean;
  _currentTab: number;
}

export type Task = Readonly<TaskCopy>;

export interface TaskWithIssueData extends Task {
  readonly issueData?: IssueData;
}


export interface TaskWithSubTasks extends TaskWithIssueData {
  readonly subTasks?: TaskWithIssueData[];
}


export const DEFAULT_TASK: Partial<Task> = {
  subTaskIds: [],
  attachmentIds: [],
  timeSpentOnDay: {},
  timeSpent: 0,
  timeEstimate: 0,
  isDone: false,
  created: Date.now(),
  _isAdditionalInfoOpen: false,
  _currentTab: 0,
};
