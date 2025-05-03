import { TaskCopy, TaskWithSubTasks } from '../task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { isToday } from '../../../util/is-today.util';

export const isShowRemoveFromToday = (task: TaskWithSubTasks | TaskCopy): boolean =>
  !task.isDone && task.dueDay === getWorklogStr();

export const isShowAddToToday = (
  task: TaskWithSubTasks | TaskCopy,
  workContextIsToday: boolean,
): boolean => {
  return (
    !isShowRemoveFromToday(task) &&
    !workContextIsToday &&
    task.dueDay !== getWorklogStr() &&
    (!task.dueWithTime || !isToday(task.dueWithTime))
  );
};
