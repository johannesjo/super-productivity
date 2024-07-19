import { Task } from '../features/tasks/task.model';

export const getTimeLeftForTask = (task: Task): number => {
  return Math.max(0, task.timeEstimate - task.timeSpent) || 0;
};

export const getTimeLeftForTasks = (tasks: Task[]): number => {
  return tasks.reduce((acc, task) => acc + getTimeLeftForTask(task), 0);
};
