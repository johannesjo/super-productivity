import { IssueProviderKey } from '../issue/issue';

export type TimeSpentOnDay = Readonly<{
  [key: string]: number;
}>;

export type Task = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  isBacklogTask?: boolean;
  isNotesOpen?: boolean;
  notes?: string;
  issueId?: string;
  issueType?: IssueProviderKey;
  subTaskIds: string[];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: TimeSpentOnDay;
  parentId?: string;
}>;


export interface TaskWithSubTaskData extends Task {
  readonly subTasks?: TaskWithAllData[];
}

export interface TaskWithAllData extends TaskWithSubTaskData {
  readonly issueData?: any;
}

