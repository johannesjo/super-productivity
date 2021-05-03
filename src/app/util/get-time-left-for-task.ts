import { Task } from '../features/tasks/task.model';

export const getTimeLeftForTask = (task: Task): number => {
  return Math.max(0, task.timeEstimate - task.timeSpent) || 0;
};
