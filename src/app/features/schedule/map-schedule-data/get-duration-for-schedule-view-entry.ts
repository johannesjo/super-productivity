import { ScheduleViewEntry } from '../schedule.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import {
  SCHEDULE_TASK_MIN_DURATION_IN_MS,
  ScheduleViewEntryType,
} from '../schedule.const';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isContinuedTaskType, isTaskDataType } from './is-schedule-types-type';

const _getDurationForViewEntry = (viewEntry: ScheduleViewEntry): number => {
  if (isTaskDataType(viewEntry)) {
    return getTimeLeftForTask(viewEntry.data);
  } else if (
    isContinuedTaskType(viewEntry) ||
    viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplitContinued ||
    viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplitContinuedLast
  ) {
    return viewEntry.data.timeToGo;
  } else if (
    viewEntry.type === ScheduleViewEntryType.RepeatProjection ||
    viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplit ||
    viewEntry.type === ScheduleViewEntryType.ScheduledRepeatProjection
  ) {
    return viewEntry.data.defaultEstimate || 0;
  } else if (viewEntry.type === ScheduleViewEntryType.CalendarEvent) {
    return viewEntry.data.duration || 0;
  } else if (viewEntry.type === ScheduleViewEntryType.LunchBreak) {
    const d = new Date();
    return (
      getDateTimeFromClockString(viewEntry.data.endTime, d) -
      getDateTimeFromClockString(viewEntry.data.startTime, d)
    );
  }
  throw new Error('Wrong type given: ' + viewEntry.type);
};
export const getDurationForScheduleViewEntry = (viewEntry: ScheduleViewEntry): number => {
  return Math.max(_getDurationForViewEntry(viewEntry), SCHEDULE_TASK_MIN_DURATION_IN_MS);
};
