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
    workStart[date] = d.start;
    workEnd[date] = d.end;
  });

  return { workStart, workEnd };
};
