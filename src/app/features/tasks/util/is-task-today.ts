import { TaskWithSubTasks } from '../task.model';
import { TODAY_TAG } from '../../tag/tag.const';

export const isTodayTag = (task: TaskWithSubTasks): boolean =>
  task.tagIds.includes(TODAY_TAG.id);

export const isShowRemoveFromToday = (task: TaskWithSubTasks): boolean =>
  !!(
    !task.isDone &&
    isTodayTag(task) &&
    (task.projectId || task.tagIds?.length > 1 || task.parentId)
  );

export const isShowAddToToday = (
  task: TaskWithSubTasks,
  workContextIsToday: boolean,
): boolean => {
  return (
    !isShowRemoveFromToday(task) &&
    !(task.parentId && workContextIsToday) &&
    !isTodayTag(task)
  );
};
