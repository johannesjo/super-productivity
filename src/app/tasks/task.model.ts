export type IssueType = 'JIRA' | 'GIT';

export type Task = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  isBacklogTask?: boolean;
  notes?: string;
  issueId?: string;
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

