import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';

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
  return copy;
}) as CrossModelMigrateFn;
