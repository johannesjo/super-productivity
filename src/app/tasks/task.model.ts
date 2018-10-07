export type IssueType = 'JIRA' | 'GIT';

export type Task = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  notes?: string;
  issueId?: string;
  parentId?: string;
  subTasks?: string[];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: Object;
  index?: number;
}>;

export type TaskWithData = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  notes?: string;
  parentId?: string;
  issueId?: string;
  issueData?: any;
  subTasks?: TaskWithData[];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: Object;
  index?: number;
}>;
