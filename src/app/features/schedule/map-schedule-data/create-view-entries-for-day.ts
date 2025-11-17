import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import {
  BlockedBlock,
  SVE,
  SVEEntryForNextDay,
  SVERepeatProjection,
  SVETask,
} from '../schedule.model';
import { ScheduleConfig } from '../../config/global-config.model';
import { createScheduleViewEntriesForNormalTasks } from './create-schedule-view-entries-for-normal-tasks';
import { insertBlockedBlocksViewEntriesForSchedule } from './insert-blocked-blocks-view-entries-for-schedule';
import { placeTasksInGaps } from './place-tasks-in-gaps';
import { placeTasksRespectingBlocks } from './place-tasks-respecting-blocks';
import { sortTasksByStrategy } from './sort-tasks-by-strategy';
import { SCHEDULE_VIEW_TYPE_ORDER, SVEType } from '../schedule.const';

export const createViewEntriesForDay = (
  dayDate: string,
  initialStartTime: number,
  nonScheduledRepeatCfgsDueOnDay: TaskRepeatCfg[],
  nonScheduledTasksForDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  blockedBlocksForDay: BlockedBlock[],
  viewEntriesPushedToNextDay: SVEEntryForNextDay[],
  scheduleConfig: ScheduleConfig,
  dayEndTime: number,
): {
  viewEntries: SVE[];
  tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[];
} => {
  let viewEntries: SVE[] = [];
  let startTime = initialStartTime;
  let tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[] = [];

  if (viewEntriesPushedToNextDay) {
    viewEntriesPushedToNextDay.forEach((ve) => {
      viewEntries.push({
        ...ve,
        start: startTime,
      });
      startTime += ve.duration;
    });
  }

  const { entries, startTimeAfter } = createViewEntriesForNonScheduledRepeatProjections(
    nonScheduledRepeatCfgsDueOnDay,
    dayDate,
    startTime,
  );
  if (entries.length) {
    startTime = startTimeAfter;
    viewEntries = viewEntries.concat(entries);
  }

  if (nonScheduledTasksForDay.length) {
    const strategy = scheduleConfig.taskPlacementStrategy;
    const allowSplitting = scheduleConfig.isAllowTaskSplitting;

    if (strategy === 'BEST_FIT') {
      // Use best-fit bin packing algorithm for optimal gap filling
      const { viewEntries: placedEntries, tasksForNextDay: nextDayTasks } =
        placeTasksInGaps(
          nonScheduledTasksForDay,
          blockedBlocksForDay,
          startTime,
          dayEndTime,
          allowSplitting,
        );
      viewEntries = viewEntries.concat(placedEntries);
      tasksForNextDay = tasksForNextDay.concat(nextDayTasks);
      // Note: tasksForNextDay will be handled by task splitting prevention logic in create-schedule-days.ts
    } else {
      // Use strategy-based sequential placement
      const sortedTasks = sortTasksByStrategy(nonScheduledTasksForDay, strategy);

      if (!allowSplitting) {
        // When splitting is not allowed, use gap-aware placement
        const { viewEntries: placedEntries, tasksForNextDay: nextDayTasks } =
          placeTasksRespectingBlocks(
            sortedTasks,
            blockedBlocksForDay,
            startTime,
            dayEndTime,
            false,
          );
        viewEntries = viewEntries.concat(placedEntries);
        tasksForNextDay = tasksForNextDay.concat(nextDayTasks);
        // Note: tasksForNextDay will be handled by task splitting prevention logic in create-schedule-days.ts
      } else {
        // When splitting is allowed, use simple sequential placement
        viewEntries = viewEntries.concat(
          createScheduleViewEntriesForNormalTasks(startTime, sortedTasks),
        );
      }
    }
  }

  insertBlockedBlocksViewEntriesForSchedule(
    viewEntries as SVETask[],
    blockedBlocksForDay,
    dayDate,
  );

  // CLEANUP
  // -------
  viewEntries.sort((a, b) => {
    if (a.start - b.start === 0) {
      return SCHEDULE_VIEW_TYPE_ORDER[a.type] - SCHEDULE_VIEW_TYPE_ORDER[b.type];
    }
    return a.start - b.start;
  });

  // TODO add current handling
  // Move current always first and let it appear as now
  // if (currentId) {
  //   const currentIndex = viewEntries.findIndex((ve) => ve.id === currentId);
  //   // NOTE: might not always be available here
  //   if (currentIndex !== -1) {
  //     viewEntries[currentIndex].start = now - 600000;
  //     viewEntries.splice(0, 0, viewEntries[currentIndex]);
  //     viewEntries.splice(currentIndex + 1, 1);
  //   } else {
  //     debug(viewEntries);
  //     Log.err('View Entry for current not available');
  //   }
  // }

  return { viewEntries, tasksForNextDay };

  // we could use this to group multiple
  // return viewEntries.map((ve, index) => {
  //   const prevEntry = viewEntries[index - 1];
  //
  //   if (prevEntry && ve.start === prevEntry.start) {
  //     return {
  //       ...ve,
  //     };
  //   }
  //   return ve;
  // });
};

const createViewEntriesForNonScheduledRepeatProjections = (
  nonScheduledRepeatCfgsDueOnDay: TaskRepeatCfg[],
  dayDate: string,
  startTime: number,
): { entries: SVE[]; startTimeAfter: number } => {
  let lastTime: number;
  let prevRepeatCfg: TaskRepeatCfg;

  const viewEntries: SVERepeatProjection[] = [];
  nonScheduledRepeatCfgsDueOnDay.forEach((taskRepeatCfg, index, arr) => {
    prevRepeatCfg = arr[index - 1];

    let time: number;

    if (lastTime) {
      if (prevRepeatCfg) {
        time = lastTime + (prevRepeatCfg?.defaultEstimate || 0);
      } else {
        throw new Error('Something weird happened');
      }
    } else {
      time = startTime;
    }

    viewEntries.push({
      id: taskRepeatCfg.id + '_' + dayDate,
      type: SVEType.RepeatProjection,
      start: time,
      data: taskRepeatCfg,
      duration: taskRepeatCfg.defaultEstimate || 0,
    });

    lastTime = time;
  });

  const lastEntry = viewEntries[viewEntries.length - 1];

  // Log.log(viewEntries);

  return {
    entries: viewEntries,
    startTimeAfter: lastEntry
      ? lastTime! + (lastEntry.data.defaultEstimate || 0)
      : startTime,
  };
};
