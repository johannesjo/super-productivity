import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { TaskCopy } from '../../features/tasks/task.model';
import { EntityState } from '@ngrx/entity';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { isArray } from 'rxjs/internal-compatibility';

export const crossModelMigration4: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  // throw new Error('Migration 4 is not implemented yet');
  console.log('____________________Migrate4__________________');
  const copy = fullData;

  if (!isArray(copy.improvement.hiddenImprovementBannerItems)) {
    copy.improvement.hiddenImprovementBannerItems = [];
  }

  migrateTasks(copy.task);
  migrateTasks(copy.archiveYoung.task);
  migrateTasks(copy.archiveOld.task);

  // @ts-ignore
  // copy.tag.entities[TODAY_TAG.id].taskIds = [];

  console.log(copy);
  return copy;
}) as CrossModelMigrateFn;

const migrateTasks = <T extends EntityState<TaskCopy>>(s: T): void => {
  Object.keys(s.entities).forEach((id) => {
    const task = s.entities[id];
    if (task) {
      if (typeof (task as any).plannedAt === 'number') {
        // @ts-ignore
        task.dueWithTime = task.plannedAt;
        delete (task as any).plannedAt;
      }
      const isTodayTagPresent = task.tagIds.includes(TODAY_TAG.id);
      if (isTodayTagPresent) {
        // remove legacy tag
        // @ts-ignore
        task.tagIds = task.tagIds.filter((value) => value !== TODAY_TAG.id);
      }
    }
  });
};
