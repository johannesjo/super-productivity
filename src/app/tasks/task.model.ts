import { IssueProviderKey } from '../issue/issue';

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
  timeSpentOnDay?: Object;
  parentId?: string;
}>;


export interface TaskWithSubTaskData extends Task {
  readonly subTasks?: TaskWithAllData[];
}

export interface TaskWithAllData extends TaskWithSubTaskData {
  readonly issueData?: any;
}

