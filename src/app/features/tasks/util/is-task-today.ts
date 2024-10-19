import { TaskWithSubTasks, Task } from '../task.model';
import { TODAY_TAG } from '../../tag/tag.const';

export const isTodayTag = (task: TaskWithSubTasks | Task): boolean =>
  task.tagIds.includes(TODAY_TAG.id);

export const isTaskNotPlannedForToday = (task: TaskWithSubTasks | Task): boolean =>
  !!(
    !task.isDone &&
    isTodayTag(task) &&
    (task.projectId || task.tagIds?.length > 1 || task.parentId)
  );

export const isTaskPlannedForToday = (
  task: TaskWithSubTasks | Task,
  workContextIsToday: boolean,
): boolean => {
  return (
    !isTaskNotPlannedForToday(task) &&
    !(task.parentId && workContextIsToday) &&
    !isTodayTag(task)
  );
};
