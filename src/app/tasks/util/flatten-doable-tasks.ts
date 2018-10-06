import { Task } from '../task';

export const flattenToDoableTasks = (tasks: Task[], currentTaskId: string) => {
  const result = [];
  tasks.forEach((task: Task) => {
    if (task.subTasks) {
      task.subTasks.forEach((subTask: Task) => {
        if (!subTask.isDone && subTask.id !== currentTaskId) {
          result.push(subTask);
        }
      });
    } else {
      if (!task.isDone && task.id !== currentTaskId) {
        result.push(task);
      }
    }
  });

  return result;
};