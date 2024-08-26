import { PlannerDay, ScheduleItemTask, ScheduleItemType } from '../planner.model';

export const getAllMissingPlannedTaskIdsForDay = (
  plannerDay: PlannerDay,
  idsToExclude: string[],
): string[] => {
  const regularTaskIds = plannerDay.tasks.map((t) => t.id) || [];
  const scheduledTaskIds =
    plannerDay.scheduledIItems
      .filter((item) => item.type === ScheduleItemType.Task)
      .map((si) => (si as ScheduleItemTask).task.id) || [];
  const plannedTodayAllTaskIds = [...regularTaskIds, ...scheduledTaskIds];

  return plannedTodayAllTaskIds.filter((tid) => !idsToExclude.includes(tid));
};
