import { TTWorkSessionByDateMap } from './time-tracking.model';
import { WorkStartEnd, WorkStartEndCopy } from '../work-context/work-context.model';

// TODO maybe replace with using the data differently
export const toLegacyWorkStartEndMaps = (
  byDate: TTWorkSessionByDateMap,
): {
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
} => {
  const workStart: WorkStartEndCopy = {};
  const workEnd: WorkStartEndCopy = {};

  Object.entries(byDate).forEach(([date, d]) => {
    if (d.s) {
      workStart[date] = d.s;
    }
    if (d.e) {
      workEnd[date] = d.e;
    }
  });

  return { workStart, workEnd };
};
