import {
  ScheduleViewEntry,
  ScheduleViewEntrySplitTaskContinued,
  ScheduleViewEntryTask,
} from '../schedule.model';
import { SCHEDULE_MOVEABLE_TYPES, ScheduleViewEntryType } from '../schedule.const';

export const isMoveableViewEntry = (viewEntry: ScheduleViewEntry): boolean => {
  return !!SCHEDULE_MOVEABLE_TYPES.find(
    (moveableType) => moveableType === viewEntry.type,
  );
};
export const isTaskDataType = (
  viewEntry: ScheduleViewEntry,
): viewEntry is ScheduleViewEntryTask => {
  return (
    viewEntry.type === ScheduleViewEntryType.Task ||
    viewEntry.type === ScheduleViewEntryType.SplitTask ||
    viewEntry.type === ScheduleViewEntryType.TaskPlannedForDay ||
    viewEntry.type === ScheduleViewEntryType.SplitTaskPlannedForDay ||
    viewEntry.type === ScheduleViewEntryType.ScheduledTask
  );
};
export const isContinuedTaskType = (
  viewEntry: ScheduleViewEntry,
): viewEntry is ScheduleViewEntrySplitTaskContinued => {
  return (
    viewEntry.type === ScheduleViewEntryType.SplitTaskContinued ||
    viewEntry.type === ScheduleViewEntryType.SplitTaskContinuedLast
  );
};
