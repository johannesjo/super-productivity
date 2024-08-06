import { TaskPlanned } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { BlockedBlockByDayMap } from '../../timeline/timeline.model';
import {
  ScheduleCalendarMapEntry,
  ScheduleLunchBreakCfg,
  ScheduleWorkStartEndCfg,
} from '../schedule.model';
import { createSortedBlockerBlocks } from '../../timeline/map-timeline-data/create-sorted-blocker-blocks';
import { getWorklogStr } from '../../../util/get-work-log-str';

// TODO improve to even better algo for createSortedBlockerBlocks
const NR_OF_DAYS = 10;

export const createBlockedBlocksByDayMap = (
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
  now?: number,
  nrOfDays: number = NR_OF_DAYS,
): BlockedBlockByDayMap => {
  const allBlockedBlocks = createSortedBlockerBlocks(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    icalEventMap,
    workStartEndCfg,
    lunchBreakCfg,
    now,
    nrOfDays,
  );

  const blockedBlocksByDay: BlockedBlockByDayMap = {};
  allBlockedBlocks.forEach((block) => {
    const dayStartDate = getWorklogStr(block.start);
    const dayEndBoundary = new Date(block.start).setHours(24, 0, 0, 0);

    if (!blockedBlocksByDay[dayStartDate]) {
      blockedBlocksByDay[dayStartDate] = [];
    }
    blockedBlocksByDay[dayStartDate].push({
      ...block,
      end: Math.min(dayEndBoundary, block.end),
      entries: block.entries.filter((e) => e.start < dayEndBoundary),
      // ...({ type: 'START' } as any),
    });

    // TODO handle case when blocker block spans multiple days
    const dayEndDate = getWorklogStr(block.end);
    if (dayStartDate !== dayEndDate) {
      const dayStartBoundary2 = new Date(block.end).setHours(0, 0, 0, 0);
      const dayEndBoundary2 = new Date(block.end).setHours(24, 0, 0, 0);

      if (!blockedBlocksByDay[dayEndDate]) {
        blockedBlocksByDay[dayEndDate] = [];
      }
      blockedBlocksByDay[dayEndDate].push({
        ...block,
        // entries: block.entries.filter((e) => e.type === BlockedBlockType.WorkdayStartEnd),
        entries: block.entries.filter((e) => e.end > dayStartBoundary2),
        // entries: block.entries,
        start: dayStartBoundary2,
        end: Math.min(dayEndBoundary2, block.end),
        // ...({ type: 'END' } as any),
      });
    }
  });

  return blockedBlocksByDay;
};
