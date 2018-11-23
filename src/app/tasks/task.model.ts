import { IssueProviderKey } from '../issue/issue';

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
  isAdditionalInfoOpen?: boolean;
  isHideSubTasks?: boolean;
  notes?: string;
  issueId?: string;
  issueType?: IssueProviderKey;
  parentId?: string;
  attachmentIds: string[];
}

export type Task = Readonly<TaskCopy>;

export interface TaskWithIssueData extends Task {
  readonly issueData?: any;
}


export interface TaskWithSubTasks extends TaskWithIssueData {
  readonly subTasks?: TaskWithIssueData[];
}
