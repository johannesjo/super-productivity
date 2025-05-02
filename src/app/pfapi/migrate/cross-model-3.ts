import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import { TODAY_TAG } from '../../features/tag/tag.const';

export const crossModelMigration3: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  const copy = dirtyDeepCopy(fullData);

  Object.keys(copy.planner.days).forEach((day) => {
    const dayTasks = copy.planner.days[day];
    dayTasks.forEach((taskId) => {
      const task = copy.task.entities[taskId];
      if (task) {
        // @ts-ignore
        task.dueDay = day;
      }
    });
  });

  Object.keys(copy.task.entities).forEach((tId) => {
    const task = copy.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });
  Object.keys(copy.archiveYoung.task).forEach((tId) => {
    const task = copy.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });
  Object.keys(copy.archiveOld.task).forEach((tId) => {
    const task = copy.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });
  return copy;
}) as CrossModelMigrateFn;
