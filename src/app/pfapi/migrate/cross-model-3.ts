import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import {
  INBOX_TAG,
  LEGACY_NO_LIST_TAG_ID,
  TODAY_TAG,
} from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { isToday } from '../../util/is-today.util';
import { TaskCopy } from '../../features/tasks/task.model';
import { EntityState } from '@ngrx/entity';
import { plannerInitialState } from '../../features/planner/store/planner.reducer';

export const crossModelMigration3: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  console.log('____________________Migrate3__________________');
  const copy = dirtyDeepCopy(fullData);

  if (copy.planner) {
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
  } else {
    copy.planner = plannerInitialState;
  }

  const todayTag = copy.tag.entities[TODAY_TAG.id];

  if (todayTag?.taskIds) {
    const idsToRemove: string[] = [];
    todayTag!.taskIds.forEach((taskId) => {
      const task = copy.task.entities[taskId];
      if (task && !task.dueDay) {
        if (task.dueWithTime) {
          if (!isToday(task.dueWithTime)) {
            idsToRemove.push(taskId);
          }
        } else {
          // @ts-ignore
          task.dueDay = getWorklogStr();
        }
      }
    });
    if (idsToRemove.length > 0) {
      // @ts-ignore
      todayTag.taskIds = copy.tag.entities[TODAY_TAG.id]!.taskIds.filter(
        (id) => !idsToRemove.includes(id),
      );
    }
  }

  // needed to replace task.tagIds if available
  if (!copy.tag.entities[INBOX_TAG.id]) {
    // @ts-ignore
    copy.tag.entities[INBOX_TAG.id] = {
      ...INBOX_TAG,
    };
    // @ts-ignore
    copy.tag.ids = [INBOX_TAG.id, ...copy.tag.ids];
  }

  const legacyNoListTag = copy.tag.entities[LEGACY_NO_LIST_TAG_ID];
  if (legacyNoListTag) {
    // @ts-ignore
    copy.tag.ids = copy.tag.ids.filter((id) => id !== LEGACY_NO_LIST_TAG_ID);
    // @ts-ignore
    delete copy.tag.entities[LEGACY_NO_LIST_TAG_ID];
  }

  migrateTasks(copy.task);
  migrateTasks(copy.archiveYoung.task);
  migrateTasks(copy.archiveOld.task);

  console.log(copy);
  return copy;
}) as CrossModelMigrateFn;

const migrateTasks = <T extends EntityState<TaskCopy>>(s: T): void => {
  Object.keys(s.entities).forEach((id) => {
    const task = s.entities[id];
    if (task) {
      const legacyNoListTagIndex = task.tagIds.findIndex(
        (tagId) => tagId === LEGACY_NO_LIST_TAG_ID,
      );
      if (legacyNoListTagIndex > -1) {
        // @ts-ignore
        task.tagIds[legacyNoListTagIndex] = INBOX_TAG.id;
      }

      // @ts-ignore
      task.tagIds = task.tagIds.filter(
        (tagId) => tagId !== TODAY_TAG.id && tagId !== LEGACY_NO_LIST_TAG_ID,
      );
    }
  });
};
