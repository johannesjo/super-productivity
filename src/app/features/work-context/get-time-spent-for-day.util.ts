import { TaskCopy } from '../tasks/task.model';

export const getTimeSpentForDay = (tasks: TaskCopy[], day: string): number => {
  return (
    tasks &&
    tasks.length &&
    tasks.reduce((acc, task) => {
      return (
        acc +
        (task.timeSpentOnDay && +task.timeSpentOnDay[day] ? +task.timeSpentOnDay[day] : 0)
      );
    }, 0)
  );
};
