import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import { TaskCopy } from '../../features/tasks/task.model';
import { EntityState } from '@ngrx/entity';

export const crossModelMigration4: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  // throw new Error('Migration 4 is not implemented yet');
  console.log('____________________Migrate4__________________');
  const copy = dirtyDeepCopy(fullData);

  migrateTasks(copy.task);
  migrateTasks(copy.archiveYoung.task);
  migrateTasks(copy.archiveOld.task);

  console.log(copy);
  return copy;
}) as CrossModelMigrateFn;

const migrateTasks = <T extends EntityState<TaskCopy>>(s: T): void => {
  Object.keys(s.entities).forEach((id) => {
    const task = s.entities[id];
    console.log(task);
    if (task) {
      if (typeof (task as any).plannedAt === 'number') {
        // @ts-ignore
        task.dueWithTime = task.plannedAt;
        delete (task as any).plannedAt;
      }
    }
  });
};
