import { ArchiveModel, TimeTrackingState } from './time-tracking.model';
import { TaskArchive } from '../tasks/task.model';

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
  // TODO sort all timeTracking data except the one for today to the archive
  return { timeTracking, archiveYoung };
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
  // TODO sort all tasks which have doneOn older threshold from now
  // TODO flush all timeTimeTracking data since it is mostly read only anyway

  // const r = splitArchiveTasksByDoneOnThreshold({
  //   youngTaskState: archiveYoung.task,
  //   oldTaskState: archiveOld.task,
  //   now,
  //   threshold,
  // });

  return { archiveYoung, archiveOld };
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
  return {
    youngTaskState,
    oldTaskState,
  };
};
