import { TimeTrackingState } from './time-tracking.model';
import { TTWorkContextSessionMap } from './time-tracking.model';

export const mergeTimeTrackingStates = ({
  current,
  archive,
  oldArchive,
}: {
  current: TimeTrackingState;
  archive: TimeTrackingState;
  oldArchive: TimeTrackingState;
}): TimeTrackingState => {
  return {
    project: mergeTimeTrackingStatesForWorkContext({
      current: current.project,
      archive: archive.project,
      oldArchive: oldArchive.project,
    }),
    tag: mergeTimeTrackingStatesForWorkContext({
      current: current.tag,
      archive: archive.tag,
      oldArchive: oldArchive.tag,
    }),
    lastFlush: current.lastFlush,
    // task: current.task,
  };
};

export const mergeTimeTrackingStatesForWorkContext = ({
  current,
  archive,
  oldArchive,
}: {
  current: TTWorkContextSessionMap;
  archive: TTWorkContextSessionMap;
  oldArchive: TTWorkContextSessionMap;
}): TTWorkContextSessionMap => {
  return {
    ...oldArchive,
    ...archive,
    ...current,
  };
};
