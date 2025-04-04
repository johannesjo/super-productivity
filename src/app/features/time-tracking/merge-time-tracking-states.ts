import { TimeTrackingState, TTWorkContextSessionMap } from './time-tracking.model';

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
    // lastFlush: current.lastFlush,
    // task: current.task,
  };
};

// WARNING: shouldn't be executed to often!!!
export const mergeTimeTrackingStatesForWorkContext = ({
  current,
  archive,
  oldArchive,
}: {
  current: TTWorkContextSessionMap;
  archive: TTWorkContextSessionMap;
  oldArchive: TTWorkContextSessionMap;
}): TTWorkContextSessionMap => {
  const result: TTWorkContextSessionMap = {};

  // Get all unique work context IDs from all three sources
  const allContextIds = new Set([
    ...Object.keys(oldArchive || {}),
    ...Object.keys(archive || {}),
    ...Object.keys(current || {}),
  ]);

  // For each work context ID
  for (const contextId of allContextIds) {
    result[contextId] = {};
    const oldDates = oldArchive?.[contextId] || {};
    const archiveDates = archive?.[contextId] || {};
    const currentDates = current?.[contextId] || {};

    // Get all unique dates for this context
    const allDates = new Set([
      ...Object.keys(oldDates),
      ...Object.keys(archiveDates),
      ...Object.keys(currentDates),
    ]);

    // For each date
    for (const date of allDates) {
      // Merge in order of priority: current > archive > oldArchive
      result[contextId][date] = {
        // First take from oldArchive
        ...oldDates[date],
        // Then override with archive
        ...archiveDates[date],
        // Finally override with current
        ...currentDates[date],
      };
    }
  }
  return result;
};
