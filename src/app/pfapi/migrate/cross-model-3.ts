import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import { INBOX_TAG, TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { isToday } from '../../util/is-today.util';

export const crossModelMigration3: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  console.log('____________________Migrate3__________________');
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

  const legacyNoListTag = copy.tag.entities[INBOX_TAG.id];
  if (legacyNoListTag) {
    if (legacyNoListTag.title === 'no list scheduled') {
      // @ts-ignore
      legacyNoListTag.title = INBOX_TAG.title;
      // @ts-ignore
      legacyNoListTag.icon = INBOX_TAG.icon;
      // @ts-ignore
      legacyNoListTag.theme = INBOX_TAG.theme;
    }
  }

  Object.keys(copy.task.entities).forEach((tId) => {
    const task = copy.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });
  Object.keys(copy.archiveYoung.task.entities).forEach((tId) => {
    const task = copy.archiveYoung.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });
  Object.keys(copy.archiveOld.task.entities).forEach((tId) => {
    const task = copy.archiveOld.task.entities[tId];
    // @ts-ignore
    task.tagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
  });

  console.log(copy);

  return copy;
}) as CrossModelMigrateFn;
