import { SVE } from '../schedule.model';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS } from '../schedule.const';

// const _getDurationForVE = (viewEntry: SVE): number => {
//   if (
//     viewEntry.type === SVEType.Task ||
//     viewEntry.type === SVEType.TaskPlannedForDay ||
//     viewEntry.type === SVEType.ScheduledTask
//   ) {
//     return getTimeLeftForTask(viewEntry.data);
//   } else if (
//     viewEntry.type === SVEType.SplitTask ||
//     viewEntry.type === SVEType.SplitTaskPlannedForDay
//   ) {
//     return viewEntry.duration;
//   } else if (
//     isContinuedTaskType(viewEntry) ||
//     viewEntry.type === SVEType.RepeatProjectionSplitContinued ||
//     viewEntry.type === SVEType.RepeatProjectionSplitContinuedLast
//   ) {
//     return viewEntry.duration;
//   } else if (
//     viewEntry.type === SVEType.RepeatProjection ||
//     viewEntry.type === SVEType.RepeatProjectionSplit ||
//     viewEntry.type === SVEType.ScheduledRepeatProjection
//   ) {
//     return viewEntry.data.defaultEstimate || 0;
//   } else if (viewEntry.type === SVEType.CalendarEvent) {
//     return viewEntry.data.duration || 0;
//   } else if (viewEntry.type === SVEType.LunchBreak) {
//     const d = new Date();
//     return (
//       getDateTimeFromClockString(viewEntry.data.endTime, d) -
//       getDateTimeFromClockString(viewEntry.data.startTime, d)
//     );
//   }
//   throw new Error('Wrong type given: ' + viewEntry.type);
// };

export const getDurationForSVE = (viewEntry: SVE): number => {
  return Math.max(viewEntry.duration, SCHEDULE_TASK_MIN_DURATION_IN_MS);
};
