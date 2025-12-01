import { TimeTrackingState, TTWorkContextSessionMap } from './time-tracking.model';

export const mergeTimeTrackingStates = ({
  current,
  archiveYoung,
  archiveOld,
}: {
  current: TimeTrackingState;
  archiveYoung: TimeTrackingState;
  archiveOld: TimeTrackingState;
}): TimeTrackingState => {
  return {
    project: mergeTimeTrackingStatesForWorkContext({
      current: current.project,
      archiveYoung: archiveYoung.project,
      archiveOld: archiveOld.project,
    }),
    tag: mergeTimeTrackingStatesForWorkContext({
      current: current.tag,
      archiveYoung: archiveYoung.tag,
      archiveOld: archiveOld.tag,
    }),
    // lastFlush: current.lastFlush,
    // task: current.task,
  };
};

/**
 * Merges time tracking data from three sources with priority: current > archiveYoung > oldArchive
 * WARNING: Performance-intensive operation, use sparingly!
 */
export const mergeTimeTrackingStatesForWorkContext = ({
  current,
  archiveYoung,
  archiveOld,
}: {
  current: TTWorkContextSessionMap;
  archiveYoung: TTWorkContextSessionMap;
  archiveOld: TTWorkContextSessionMap;
}): TTWorkContextSessionMap => {
  const result: TTWorkContextSessionMap = {};

  // Get all unique work context IDs from all three sources
  const allContextIds = new Set([
    ...Object.keys(archiveOld || {}),
    ...Object.keys(archiveYoung || {}),
    ...Object.keys(current || {}),
  ]);

  // For each work context ID
  for (const contextId of allContextIds) {
    const archiveOldDates = archiveOld?.[contextId] || {};
    const archiveYoungDates = archiveYoung?.[contextId] || {};
    const currentDates = current?.[contextId] || {};

    // Get all unique dates for this context
    const allDates = Array.from(
      new Set([
        ...Object.keys(archiveOldDates),
        ...Object.keys(archiveYoungDates),
        ...Object.keys(currentDates),
      ]),
    );

    if (allDates.length === 0) {
      continue;
    }

    for (const date of allDates) {
      const newData = {
        // Merge in order of priority: current > archiveYoung > archiveOld
        ...archiveOldDates[date],
        ...archiveYoungDates[date],
        ...currentDates[date],
      };
      if (Object.keys(newData).length > 0) {
        if (!result[contextId]) {
          result[contextId] = {};
        }
        result[contextId][date] = newData;
      }
    }
  }
  return result;
};
