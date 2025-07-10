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
import { createScheduleViewEntriesForNormalTasks } from './create-schedule-view-entries-for-normal-tasks';
import { insertBlockedBlocksViewEntriesForSchedule } from './insert-blocked-blocks-view-entries-for-schedule';
import { SCHEDULE_VIEW_TYPE_ORDER, SVEType } from '../schedule.const';

export const createViewEntriesForDay = (
  dayDate: string,
  initialStartTime: number,
  nonScheduledRepeatCfgsDueOnDay: TaskRepeatCfg[],
  nonScheduledTasksForDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  blockedBlocksForDay: BlockedBlock[],
  viewEntriesPushedToNextDay: SVEEntryForNextDay[],
): SVE[] => {
  let viewEntries: SVE[] = [];
  let startTime = initialStartTime;

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
    viewEntries = viewEntries.concat(
      createScheduleViewEntriesForNormalTasks(startTime, nonScheduledTasksForDay),
    );
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

  return viewEntries;

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
