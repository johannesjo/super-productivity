import { ScheduleEvent, SVE, SVESplitTaskContinued, SVETask } from '../schedule.model';
import { SCHEDULE_FLOW_TYPES, SVEType } from '../schedule.const';

export const isFlowableEntryVE = (viewEntry: SVE): boolean => {
  return !!SCHEDULE_FLOW_TYPES.find((moveableType) => moveableType === viewEntry.type);
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

// export const isDraggableVE = (viewEntry: SVE): viewEntry is SVETask => {
//   return (
//     viewEntry.type === SVEType.Task ||
//     viewEntry.type === SVEType.SplitTask ||
//     viewEntry.type === SVEType.TaskPlannedForDay ||
//     viewEntry.type === SVEType.SplitTaskPlannedForDay
//   );
// };

export const isDraggableSE = (se: ScheduleEvent): se is ScheduleEvent => {
  return (
    se.type === SVEType.Task ||
    se.type === SVEType.ScheduledTask ||
    se.type === SVEType.SplitTask ||
    se.type === SVEType.TaskPlannedForDay ||
    se.type === SVEType.SplitTaskPlannedForDay
  );
};
