export class Task {
  id: string;
  title: string;
  isDone?: boolean;
  notes?: string;
  parentId?: string;
  subTasks?: [Task];
  progress?: number;
  timeSpent?: any;
  timeEstimate?: string;
  timeSpentOnDay?: Object;
  index?: number;
}