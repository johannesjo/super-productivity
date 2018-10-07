export type Task = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  notes?: string;
  parentId?: string;
  subTasks?: string[];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: Object;
  index?: number;
}>;

export type TaskWithSubTasks = Readonly<{
  id: string;
  title: string;
  isDone?: boolean;
  notes?: string;
  parentId?: string;
  subTasks?: TaskWithSubTasks[];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: Object;
  index?: number;
}>;
