import { TaskCopy, TaskWithSubTasks } from '../task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { isToday } from '../../../util/is-today.util';

export const isShowRemoveFromToday = (task: TaskWithSubTasks | TaskCopy): boolean =>
  !!(
    (
      !task.isDone &&
      (task.projectId || task.tagIds?.length > 1 || task.parentId) &&
      task.dueDay === getWorklogStr()
    )
    // we don't show here
    // &&     (task.dueWithTime && isToday(task.dueWithTime))
  );

export const isShowAddToToday = (
  task: TaskWithSubTasks | TaskCopy,
  workContextIsToday: boolean,
): boolean => {
  return (
    !isShowRemoveFromToday(task) &&
    !(task.parentId && workContextIsToday) &&
    task.dueDay !== getWorklogStr() &&
    (!task.dueWithTime || !isToday(task.dueWithTime))
  );
};
