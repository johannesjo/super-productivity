import { SVE, SVESplitTaskContinued, SVETask } from '../schedule.model';
import { SCHEDULE_MOVEABLE_TYPES, SVEType } from '../schedule.const';

export const isMoveableVE = (viewEntry: SVE): boolean => {
  return !!SCHEDULE_MOVEABLE_TYPES.find(
    (moveableType) => moveableType === viewEntry.type,
  );
};
export const isTaskDataType = (viewEntry: SVE): viewEntry is SVETask => {
  return (
    viewEntry.type === SVEType.Task ||
    viewEntry.type === SVEType.SplitTask ||
    viewEntry.type === SVEType.TaskPlannedForDay ||
    viewEntry.type === SVEType.SplitTaskPlannedForDay ||
    viewEntry.type === SVEType.ScheduledTask
  );
};
export const isContinuedTaskType = (
  viewEntry: SVE,
): viewEntry is SVESplitTaskContinued => {
  return (
    viewEntry.type === SVEType.SplitTaskContinued ||
    viewEntry.type === SVEType.SplitTaskContinuedLast
  );
};
