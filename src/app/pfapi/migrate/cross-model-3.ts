import { AppDataCompleteNew } from '../pfapi-config';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';
import { CrossModelMigrateFn } from '../api';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { isToday } from '../../util/is-today.util';
import { TaskCopy } from '../../features/tasks/task.model';
import { EntityState } from '@ngrx/entity';
import { plannerInitialState } from '../../features/planner/store/planner.reducer';
import {
  INBOX_PROJECT,
  LEGACY_NO_LIST_TAG_ID,
} from '../../features/project/project.const';
import { ProjectState } from '../../features/project/project.model';

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
  if (!copy.project.entities[INBOX_PROJECT.id]) {
    // @ts-ignore
    copy.project.entities[INBOX_PROJECT.id] = {
      ...INBOX_PROJECT,
    };
    // @ts-ignore
    copy.project.ids = [INBOX_PROJECT.id, ...copy.project.ids];
  }

  const legacyNoListTag = copy.tag.entities[LEGACY_NO_LIST_TAG_ID];
  if (legacyNoListTag) {
    // @ts-ignore
    copy.tag.ids = copy.tag.ids.filter((id) => id !== LEGACY_NO_LIST_TAG_ID);
    // @ts-ignore
    delete copy.tag.entities[LEGACY_NO_LIST_TAG_ID];
  }

  migrateTasks(copy.task, copy.project);
  migrateTasks(copy.archiveYoung.task, copy.project);
  migrateTasks(copy.archiveOld.task, copy.project);

  console.log(copy);
  return copy;
}) as CrossModelMigrateFn;

const migrateTasks = <T extends EntityState<TaskCopy>>(
  s: T,
  projectState: ProjectState,
): void => {
  const inboxProject = projectState.entities[INBOX_PROJECT.id]!;

  Object.keys(s.entities).forEach((id) => {
    const task = s.entities[id];
    if (task) {
      const isLegacyNoListTagPresent = task.tagIds.includes(LEGACY_NO_LIST_TAG_ID);
      if (isLegacyNoListTagPresent) {
        // @ts-ignore
        task.tagIds = task.tagIds.filter((value) => value !== LEGACY_NO_LIST_TAG_ID);
        if (!task.projectId) {
          // @ts-ignore
          task.projectId = INBOX_PROJECT.id;
          // @ts-ignore
          inboxProject.taskIds = [...inboxProject.taskIds, task.id];
        }
      }
    }
  });
};
