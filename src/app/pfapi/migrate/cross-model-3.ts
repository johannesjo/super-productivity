import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getDbDateStr } from '../../util/get-db-date-str';
import { isToday } from '../../util/is-today.util';
import { TaskCopy } from '../../features/tasks/task.model';
import { EntityState } from '@ngrx/entity';
import { plannerInitialState } from '../../features/planner/store/planner.reducer';
import {
  INBOX_PROJECT,
  LEGACY_NO_LIST_TAG_ID,
} from '../../features/project/project.const';
import { ProjectState } from '../../features/project/project.model';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { issueProviderInitialState } from '../../features/issue/store/issue-provider.reducer';
import { PFLog } from '../../core/log';

const LEGACY_INBOX_PROJECT_ID = 'INBOX' as const;

export const crossModelMigration3: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate3__________________');
  const copy = fullData;

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
          task.dueDay = getDbDateStr();
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

  const isMigrateLegacyInboxProject =
    !!copy.project.entities[LEGACY_INBOX_PROJECT_ID] &&
    !copy.project.entities[INBOX_PROJECT.id] &&
    copy.project.entities['INBOX']?.title.includes('box');

  // check and migrate legacy INBOX project
  if (isMigrateLegacyInboxProject) {
    // @ts-ignore
    copy.project.entities[INBOX_PROJECT.id] = {
      ...INBOX_PROJECT,
      ...copy.project.entities[LEGACY_INBOX_PROJECT_ID],
      id: INBOX_PROJECT.id,
      taskIds: [],
      backlogTaskIds: [],
    };
    // @ts-ignore
    copy.project.ids = [
      INBOX_PROJECT.id,
      ...copy.project.ids.filter((id) => id !== LEGACY_INBOX_PROJECT_ID),
    ];
    delete copy.project.entities[LEGACY_INBOX_PROJECT_ID];

    // also migrate noteIds
    Object.keys(copy.note.entities).forEach((id) => {
      const note = copy.note.entities[id];
      if (note && note.projectId === LEGACY_INBOX_PROJECT_ID) {
        // @ts-ignore
        note.projectId = INBOX_PROJECT.id;
        // @ts-ignore
        copy.project.entities[INBOX_PROJECT.id]!.noteIds = [
          ...copy.project.entities[INBOX_PROJECT.id]!.noteIds,
          note.id,
        ];
      }
    });

    // @ts-ignore
    copy.globalConfig.misc.defaultProjectId = null;
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

  migrateTasks(copy.task, copy.project, false, isMigrateLegacyInboxProject);
  migrateTasks(copy.archiveYoung.task, copy.project, true, isMigrateLegacyInboxProject);
  migrateTasks(copy.archiveOld.task, copy.project, true, isMigrateLegacyInboxProject);

  // add default configs
  copy.globalConfig = {
    ...DEFAULT_GLOBAL_CONFIG,
    ...copy.globalConfig,
  };

  if (!copy.issueProvider) {
    copy.issueProvider = issueProviderInitialState;
  }

  // cleanup task repeat stuff legacy (TODAY_TAG mainly)
  const availableTagIds = Object.keys(copy.tag.entities);
  Object.keys(copy.taskRepeatCfg.entities).forEach((id) => {
    const taskRepeatCfg = copy.taskRepeatCfg.entities[id];
    if (taskRepeatCfg && taskRepeatCfg.tagIds.length > 0) {
      // @ts-ignore
      taskRepeatCfg.tagIds = taskRepeatCfg.tagIds.filter((tagId) =>
        availableTagIds.includes(tagId),
      );
    }
    if (
      taskRepeatCfg?.projectId &&
      taskRepeatCfg?.projectId === LEGACY_INBOX_PROJECT_ID
    ) {
      // @ts-ignore
      taskRepeatCfg.projectId = INBOX_PROJECT.id;
    }
  });

  PFLog.log(copy);
  return copy;
}) as CrossModelMigrateFn;

const migrateTasks = <T extends EntityState<TaskCopy>>(
  s: T,
  projectState: ProjectState,
  isArchive: boolean,
  isMigrateLegacyInboxProject: boolean,
): void => {
  const inboxProject = projectState.entities[INBOX_PROJECT.id]!;

  Object.keys(s.entities).forEach((id) => {
    const task = s.entities[id];
    if (task) {
      const isLegacyNoListTagPresent = task.tagIds.includes(LEGACY_NO_LIST_TAG_ID);
      if (isLegacyNoListTagPresent) {
        // remove legacy tag
        // @ts-ignore
        task.tagIds = task.tagIds.filter((value) => value !== LEGACY_NO_LIST_TAG_ID);
      }

      // add inbox project to all tasks without projectId
      if (!task.projectId) {
        // @ts-ignore
        task.projectId = INBOX_PROJECT.id;
        if (!isArchive && !task.parentId) {
          // @ts-ignore
          inboxProject.taskIds = [...inboxProject.taskIds, task.id];
        }
      }

      if (isMigrateLegacyInboxProject && task.projectId === LEGACY_INBOX_PROJECT_ID) {
        // @ts-ignore
        task.projectId = INBOX_PROJECT.id;
        if (!isArchive && !task.parentId) {
          // @ts-ignore
          inboxProject.taskIds = [...inboxProject.taskIds, task.id];
        }
      }

      // cleanup null values once more
      task.issueId = task.issueId || undefined;
      task.issueProviderId = task.issueProviderId || undefined;
      task.issueType =
        (task.issueType as any) === 'CALENDAR' ? 'ICAL' : task.issueType || undefined;
      task.issueWasUpdated = task.issueWasUpdated || undefined;
      task.issueLastUpdated = task.issueLastUpdated || undefined;
      task.issueAttachmentNr = task.issueAttachmentNr || undefined;
      task.issueTimeTracked = task.issueTimeTracked || undefined;
      task.issuePoints = task.issuePoints || undefined;
      task.reminderId = task.reminderId || undefined;
      task.parentId = task.parentId || undefined;
      task.doneOn = task.doneOn || undefined;
      task.timeEstimate = task.timeEstimate || 0;
      task.timeSpent = task.timeSpent || 0;
    }
  });
};
