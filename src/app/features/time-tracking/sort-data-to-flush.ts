import { ArchiveModel, TimeTrackingState } from './time-tracking.model';

export const sortDataToFlush = ({
  timeTracking,
  archiveYoung,
  archiveOld,
}: {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
}): {
  timeTracking: TimeTrackingState;
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
} => {
  return { timeTracking, archiveYoung, archiveOld };
};

export const sortTaskArchive = ({
  archiveYoung,
  archiveOld,
}: {
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
}): {
  archiveYoung: ArchiveModel;
  archiveOld: ArchiveModel;
} => {
  // TODO sort all tasks with....
  return { archiveYoung, archiveOld };
};
