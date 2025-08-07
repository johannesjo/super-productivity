import {
  ArchiveModel,
  TimeTrackingState,
  TTWorkContextSessionMap,
} from './time-tracking.model';
import { ArchiveTask, TaskArchive } from '../tasks/task.model';
import { ImpossibleError } from '../../pfapi/api';
import { dirtyDeepCopy } from '../../util/dirtyDeepCopy';

const TIME_TRACKING_CATEGORIES = ['project', 'tag'] as const;

export const sortTimeTrackingDataToArchiveYoung = ({
  timeTracking,
  archiveYoung,
  todayStr,
}: {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
  todayStr: string;
}): {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
} => {
  const currTT = dirtyDeepCopy(timeTracking);
  const archiveTT = dirtyDeepCopy(archiveYoung.timeTracking);

  // Find dates that are not today and move them to archive
  // First iterate over categories (project, tag)
  TIME_TRACKING_CATEGORIES.forEach((category) => {
    if (!currTT[category]) currTT[category] = {};
    if (!archiveTT[category]) archiveTT[category] = {};

    // Then iterate over each project/tag within the category
    Object.keys(timeTracking[category]).forEach((contextId) => {
      if (!currTT[category][contextId]) currTT[category][contextId] = {};
      if (!archiveTT[category][contextId]) archiveTT[category][contextId] = {};

      // Finally iterate over dates for each project/tag
      Object.keys(timeTracking[category][contextId]).forEach((dateStr) => {
        if (dateStr !== todayStr) {
          // Move to archive
          if (!archiveTT[category][contextId]) {
            archiveTT[category][contextId] = {};
          }
          archiveTT[category][contextId][dateStr] =
            timeTracking[category][contextId][dateStr];
          delete currTT[category][contextId][dateStr];
        }
      });
    });
  });

  return {
    timeTracking: currTT,
    archiveYoung: {
      ...archiveYoung,
      timeTracking: archiveTT,
    },
  };
};

export const sortTimeTrackingAndTasksFromArchiveYoungToOld = ({
  archiveYoung,
  archiveOld,
  threshold,
  now,
}: {
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
  threshold: number;
  now: number;
}): {
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
} => {
  // Sort tasks based on doneOn threshold
  const { youngTaskState, oldTaskState } = splitArchiveTasksByDoneOnThreshold({
    youngTaskState: archiveYoung.task,
    oldTaskState: archiveOld.task,
    now,
    threshold,
  });

  // Move all timeTracking data from young to old archive
  // Deep merge time tracking data from young to old archive
  const mergedTimeTracking = {
    project: mergeTimeTrackingCategory(
      archiveYoung.timeTracking.project,
      archiveOld.timeTracking.project,
    ),
    tag: mergeTimeTrackingCategory(
      archiveYoung.timeTracking.tag,
      archiveOld.timeTracking.tag,
    ),
  };

  return {
    archiveYoung: {
      ...archiveYoung,
      task: youngTaskState,
      // Clear timeTracking data from young archive
      timeTracking: {
        project: {},
        tag: {},
      },
    },
    archiveOld: {
      ...archiveOld,
      task: oldTaskState,
      timeTracking: mergedTimeTracking,
    },
  };
};

const mergeTimeTrackingCategory = (
  source: TTWorkContextSessionMap,
  target: TTWorkContextSessionMap,
): TTWorkContextSessionMap => {
  const result = { ...target };

  Object.entries(source || {}).forEach(([contextId, contextData]) => {
    if (!result[contextId]) {
      result[contextId] = {};
    }

    Object.entries(contextData).forEach(([dateStr, entry]) => {
      result[contextId][dateStr] = entry;
    });
  });

  return result;
};

export const splitArchiveTasksByDoneOnThreshold = ({
  youngTaskState,
  oldTaskState,
  threshold,
  now,
}: {
  youngTaskState: TaskArchive;
  oldTaskState: TaskArchive;
  threshold: number;
  now: number;
}): {
  youngTaskState: TaskArchive;
  oldTaskState: TaskArchive;
} => {
  // Find tasks that should be moved to old archive (doneOn < threshold)
  const tasksToMove = Object.values(youngTaskState.entities).filter((task) => {
    if (!task) {
      throw new ImpossibleError('splitArchiveTasksByDoneOnThreshold(): Task not found');
    }
    // NOTE: we also need to consider legacy tasks without doneOn
    return !task.parentId && (task.doneOn ? now - task.doneOn > threshold : true);
  }) as ArchiveTask[];

  // Exit early if no tasks to move
  if (tasksToMove.length === 0) {
    return { youngTaskState, oldTaskState };
  }

  // Create new states
  const newYoungEntities = { ...youngTaskState.entities };
  const newOldEntities = { ...oldTaskState.entities };

  // Move tasks to old archive
  tasksToMove.forEach((task) => {
    delete newYoungEntities[task.id];
    newOldEntities[task.id] = task;
    // Always move subtasks together with their parent
    if (task.subTaskIds) {
      task.subTaskIds.forEach((subTaskId) => {
        const subTask = newYoungEntities[subTaskId];
        if (subTask) {
          delete newYoungEntities[subTaskId];
          newOldEntities[subTaskId] = subTask;
        }
      });
    }
  });

  return {
    youngTaskState: {
      ids: Object.keys(newYoungEntities),
      entities: newYoungEntities,
    },
    oldTaskState: {
      ids: Object.keys(newOldEntities),
      entities: newOldEntities,
    },
  };
};
