import { IssueProviderKey } from '../issue/issue';

export type TimeSpentOnDay = Readonly<{
  [key: string]: number;
}>;

export type Task = Readonly<{
  id: string;
  title: string;

  subTaskIds: string[];
  timeSpentOnDay: TimeSpentOnDay;
  timeSpent: number;
  timeEstimate: number;

  isDone?: boolean;
  isNotesOpen?: boolean;
  notes?: string;
  issueId?: string;
  issueType?: IssueProviderKey;
  parentId?: string;
}>;

export interface TaskWithIssueData extends Task {
  readonly issueData?: any;
}


export interface TaskWithSubTasks extends TaskWithIssueData {
  readonly subTasks?: TaskWithIssueData[];
}
