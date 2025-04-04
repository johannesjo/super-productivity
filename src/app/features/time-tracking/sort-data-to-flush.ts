import { ArchiveModel, TimeTrackingState } from './time-tracking.model';
import { ArchiveTask, TaskArchive } from '../tasks/task.model';
import { ImpossibleError } from '../../pfapi/api';

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
  const currTT = { ...timeTracking };
  const archiveTT = { ...archiveYoung.timeTracking };

  // Find dates that are not today and move them to archive
  // First iterate over categories (project, tag)
  Object.keys(timeTracking).forEach((category) => {
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
    project: { ...archiveOld.timeTracking.project },
    tag: { ...archiveOld.timeTracking.tag },
  };

  // Merge project data
  Object.entries(archiveYoung.timeTracking.project || {}).forEach(
    ([projectId, projectData]) => {
      if (!mergedTimeTracking.project[projectId]) {
        mergedTimeTracking.project[projectId] = {};
      }
      // Copy all date entries for this project
      Object.entries(projectData).forEach(([dateStr, entry]) => {
        mergedTimeTracking.project[projectId][dateStr] = entry;
      });
    },
  );

  // Merge tag data
  Object.entries(archiveYoung.timeTracking.tag || {}).forEach(([tagId, tagData]) => {
    if (!mergedTimeTracking.tag[tagId]) {
      mergedTimeTracking.tag[tagId] = {};
    }
    // Copy all date entries for this tag
    Object.entries(tagData).forEach(([dateStr, entry]) => {
      mergedTimeTracking.tag[tagId][dateStr] = entry;
    });
  });

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
