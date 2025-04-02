import { ArchiveModel, TimeTrackingState } from './time-tracking.model';

export const sortDataToFlush = ({
  timeTracking,
  archive,
  archiveOld,
}: {
  timeTracking: TimeTrackingState;
  archive: ArchiveModel;
  archiveOld: ArchiveModel;
}): {
  timeTracking: TimeTrackingState;
  archive: ArchiveModel;
  archiveOld: ArchiveModel;
} => {
  return { timeTracking, archive, archiveOld };
};

export const sortTaskArchive = ({
  archive,
  archiveOld,
}: {
  archive: ArchiveModel;
  archiveOld: ArchiveModel;
}): {
  archive: ArchiveModel;
  archiveOld: ArchiveModel;
} => {
  // TODO sort all tasks with....
  return { archive, archiveOld };
};
