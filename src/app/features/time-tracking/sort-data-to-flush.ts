import { ArchiveModel, TimeTrackingState } from './time-tracking.model';
import { ArchiveTask, TaskArchive } from '../tasks/task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { ImpossibleError } from '../../pfapi/api';

export const sortTimeTrackingDataToArchiveYoung = ({
  timeTracking,
  archiveYoung,
}: {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
}): {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
} => {
  const todayStr = getWorklogStr();

  const currTT = { ...timeTracking };
  const archiveTT = { ...archiveYoung.timeTracking };

  // Find dates that are not today and move them to archive
  Object.keys(timeTracking).forEach((projectOrTag) => {
    Object.keys(timeTracking[projectOrTag]).forEach((dateStr) => {
      if (dateStr !== todayStr) {
        archiveTT[projectOrTag][dateStr] = currTT[projectOrTag][dateStr];
        delete currTT[projectOrTag][dateStr];
      }
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
  const mergedTimeTracking = {
    ...archiveOld.timeTracking,
    ...archiveYoung.timeTracking,
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
    return task.doneOn && now - task.doneOn > threshold;
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
