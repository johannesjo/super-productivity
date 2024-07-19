import { Task, TaskPlanned, TaskWithoutReminder } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  BlockedBlock,
  BlockedBlockByDayMap,
  BlockedBlockType,
  TimelineCalendarMapEntry,
  TimelineDay,
  TimelineLunchBreakCfg,
  TimelineViewEntry,
  TimelineViewEntrySplitTaskContinued,
  TimelineViewEntryTask,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { PlannerDayMap } from '../../planner/planner.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { TIMELINE_MOVEABLE_TYPES, TimelineViewEntryType } from '../timeline.const';
import moment from 'moment/moment';
import {
  getTimeLeftForTask,
  getTimeLeftForTasks,
} from '../../../util/get-time-left-for-task';
import { msLeftToday } from '../../../util/ms-left-today';

// const debug = (...args: any) => console.log(...args);
const debug = (...args: any): void => undefined;

export const mapToTimelineDays = (
  dayDates: string[],
  tasks: Task[],
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  calenderWithItems: TimelineCalendarMapEntry[],
  currentId: string | null,
  plannerDayMap: PlannerDayMap,
  workStartEndCfg?: TimelineWorkStartEndCfg,
  lunchBreakCfg?: TimelineLunchBreakCfg,
  now: number = Date.now(),
): TimelineDay[] => {
  let startTime = now;
  const plannerDayKeys = Object.keys(plannerDayMap);
  const plannerDayTasks = plannerDayKeys
    .map((key) => {
      return plannerDayMap[key];
    })
    .flat();

  if (
    !tasks.length &&
    !scheduledTasks.length &&
    !scheduledTaskRepeatCfgs.length &&
    !calenderWithItems.length &&
    !plannerDayTasks.length
  ) {
    return [];
  }

  if (workStartEndCfg) {
    const startTimeToday = getDateTimeFromClockString(workStartEndCfg.startTime, now);
    if (startTimeToday > now) {
      startTime = startTimeToday;
    }
  }

  const initialTasks: Task[] = currentId
    ? resortTasksWithCurrentFirst(currentId, tasks)
    : tasks;

  const nonScheduledTasks: TaskWithoutReminder[] = initialTasks.filter(
    (task) => !(task.reminderId && task.plannedAt),
  ) as TaskWithoutReminder[];

  const blockerBlocksDayMap = createBlockedBlocksByDayMap(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    calenderWithItems,
    workStartEndCfg,
    lunchBreakCfg,
    now,
  );
  console.log({ blockerBlocksDayMap });

  const v = createTimelineDays(
    nonScheduledTasks,
    dayDates,
    plannerDayMap,
    blockerBlocksDayMap,
    now,
  );
  console.log(v);

  return v;
};

export const createTimelineDays = (
  nonScheduledTasks: Task[],
  dayDates: string[],
  plannerDayMap: PlannerDayMap,
  blockerBlocksDayMap: BlockedBlockByDayMap,
  now: number,
): TimelineDay[] => {
  let regularTasksLeftForDay: Task[] = nonScheduledTasks;
  const v: TimelineDay[] = dayDates.map((dayDate, i) => {
    const blockerBlocksForDay = blockerBlocksDayMap[dayDate] || [];
    const taskPlannedForDay = plannerDayMap[dayDate] || [];
    const timeLeftForRegular = getTimeLeftForTasks(regularTasksLeftForDay);
    const nonScheduledBudgetForDay = getBudgetLeftForDay(
      blockerBlocksForDay,
      i === 0 ? now : undefined,
    );

    if (nonScheduledBudgetForDay - timeLeftForRegular > 0) {
      // we have budget left for other tasks like the planned for day ones
      // TODO  we sort the planned for today ones if any and slit them as needed and create overdue tasks
      if (nonScheduledBudgetForDay - timeLeftForRegular === 0) {
        // no splitting is needed, all tasks planed for today are OVER_BUDGET
      }
    } else {
      // we are out of budget for regular task, so we cut them off for the next today
      // AND we sort in the tasks that were planned for today ALL as OVER_BUDGET
    }

    // const tasksWithinBudget
    // const tasksOutsideBudget

    // const tasksForDay = [...nonScheduledTasks, ...taskPlannedForDay];

    console.log(
      nonScheduledBudgetForDay / 60 / 60 / 1000,
      ' – ',
      nonScheduledBudgetForDay,
    );
    console.log({
      dayDate,
      blockerBlocksForDay,
      taskPlannedForDay,
      timeLeftForRegular,
      nonScheduledBudgetForDay,
      nonScheduledBudgetForDay2: nonScheduledBudgetForDay / 60 / 60 / 1000,
    });

    return {
      dayDate,
      entries: [],
      isToday: i === 0,
    };
  });
  return v;
};

// TODO unit test
export const getBudgetLeftForDay = (
  blockerBlocksForDay: BlockedBlock[],
  nowIfToday?: number,
): number => {
  if (nowIfToday) {
    return blockerBlocksForDay.reduce((acc, currentValue) => {
      const diff =
        Math.max(nowIfToday, currentValue.end) - Math.max(nowIfToday, currentValue.start);
      return acc - diff;
    }, msLeftToday(nowIfToday));
  }

  return blockerBlocksForDay.reduce(
    (acc, currentValue) => {
      return acc - (currentValue.end - currentValue.start);
    },
    24 * 60 * 60 * 1000,
  );
};

const createBlockedBlocksByDayMap = (
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: TimelineCalendarMapEntry[],
  workStartEndCfg?: TimelineWorkStartEndCfg,
  lunchBreakCfg?: TimelineLunchBreakCfg,
  now?: number,
): BlockedBlockByDayMap => {
  const allBlockedBlocks = createSortedBlockerBlocks(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    icalEventMap,
    workStartEndCfg,
    lunchBreakCfg,
    now,
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
    });

    const dayEndDate = getWorklogStr(block.end);
    if (dayStartDate !== dayEndDate) {
      const dayStartBoundary2 = new Date(block.end).setHours(0, 0, 0, 0);
      const dayEndBoundary2 = new Date(block.end).setHours(24, 0, 0, 0);

      if (!blockedBlocksByDay[dayEndDate]) {
        blockedBlocksByDay[dayEndDate] = [];
      }
      blockedBlocksByDay[dayEndDate].push({
        ...block,
        start: dayStartBoundary2,
        end: Math.min(dayEndBoundary2, block.end),
      });
    }
  });

  // TODO handle case when blocker block spans multiple days

  return blockedBlocksByDay;
};

const resortTasksWithCurrentFirst = (currentId: string, tasks: Task[]): Task[] => {
  let newTasks = tasks;
  const currentTask = tasks.find((t) => t.id === currentId);
  if (currentTask) {
    newTasks = [currentTask, ...tasks.filter((t) => t.id !== currentId)] as Task[];
  }
  return newTasks;
};

// This function cleans up the workdays start/ends and lunch breaks from days with no tasks
export const clearEntries = (
  entries: TimelineViewEntry[],
  lunchBreakEnabled: boolean,
): TimelineViewEntry[] => {
  // filter out first entry if LunchBreak
  if (entries[0]?.type === TimelineViewEntryType.LunchBreak) {
    entries.splice(0, 1);
  }

  // filter out first entry if LunchBreak
  if (entries[0]?.type === TimelineViewEntryType.WorkdayEnd) {
    entries.splice(0, 1);
  }

  // remove dayStartEnd and lunchBreak entries if last
  let isWorkdayTypeLast = true;
  while (isWorkdayTypeLast) {
    const last = entries[entries.length - 1];

    // keep at least one day. To avoid empty timelines
    if ((lunchBreakEnabled && entries.length <= 3) || entries.length <= 2) {
      isWorkdayTypeLast = false;
    }
    if (
      last &&
      (last.type === TimelineViewEntryType.WorkdayEnd ||
        last.type === TimelineViewEntryType.WorkdayStart ||
        last.type === TimelineViewEntryType.LunchBreak)
    ) {
      entries.splice(entries.length - 1, 1);
    } else {
      isWorkdayTypeLast = false;
    }
  }

  // filter out excess entries for start/end
  // NOTE: not pretty but works
  const cleanedUpExcessWorkDays: TimelineViewEntry[] = [];
  let index = 0;

  while (index < entries.length) {
    const entry = entries[index];
    // We skip the first entry because we'd like to keep at least one entry. To avoid empty timelines
    if (index > 0) {
      const next = entries[index + 1];
      if (lunchBreakEnabled) {
        const afterNext = entries[index + 2];
        if (
          entry.type === TimelineViewEntryType.WorkdayStart &&
          next.type === TimelineViewEntryType.LunchBreak &&
          afterNext.type === TimelineViewEntryType.WorkdayEnd
        ) {
          index += 3;
          continue;
        }
      } else if (
        entry.type === TimelineViewEntryType.WorkdayStart &&
        next.type === TimelineViewEntryType.WorkdayEnd
      ) {
        index += 2;
        continue;
      }
    }
    ++index;
    cleanedUpExcessWorkDays.push(entry);
  }

  //debug('mapToViewEntriesE', cleanedUpExcessWorkDays, {
  //   asString: JSON.stringify(cleanedUpExcessWorkDays),
  //});

  return cleanedUpExcessWorkDays;
};

const createViewEntriesForBlock = (blockedBlock: BlockedBlock): TimelineViewEntry[] => {
  const viewEntriesForBock: TimelineViewEntry[] = [];
  blockedBlock.entries.forEach((entry) => {
    if (entry.type === BlockedBlockType.ScheduledTask) {
      const scheduledTask = entry.data;
      viewEntriesForBock.push({
        id: scheduledTask.id,
        start: scheduledTask.plannedAt,
        type: TimelineViewEntryType.ScheduledTask,
        data: scheduledTask,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.ScheduledRepeatProjection) {
      const repeatCfg = entry.data;
      viewEntriesForBock.push({
        id: repeatCfg.id,
        start: entry.start,
        type: TimelineViewEntryType.ScheduledRepeatTaskProjection,
        data: repeatCfg,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.CalendarEvent) {
      const calendarEvent = entry.data;
      viewEntriesForBock.push({
        // TODO fix
        id: calendarEvent.title,
        start: entry.start,
        type: TimelineViewEntryType.CalendarEvent,
        data: {
          ...calendarEvent,
          icon: calendarEvent.icon || 'event',
        },
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.WorkdayStartEnd) {
      // NOTE: day start and end are mixed up, because it is the opposite as the blocked range

      const workdayCfg = entry.data;
      viewEntriesForBock.push({
        id: 'DAY_END_' + entry.start,
        start: entry.start,
        type: TimelineViewEntryType.WorkdayEnd,
        data: workdayCfg,
        isHideTime: false,
      });
      viewEntriesForBock.push({
        id: 'DAY_START_' + entry.end,
        start: entry.end,
        type: TimelineViewEntryType.WorkdayStart,
        data: workdayCfg,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.LunchBreak) {
      viewEntriesForBock.push({
        id: 'LUNCH_BREAK_' + entry.start,
        start: entry.start,
        type: TimelineViewEntryType.LunchBreak,
        data: entry.data,
        isHideTime: false,
      });
    }
  });
  viewEntriesForBock.sort((a, b) => a.start - b.start);

  return viewEntriesForBock;
};

const insertBlockedBlocksViewEntries = (
  viewEntriesIn: TimelineViewEntryTask[],
  blockedBlocks: BlockedBlock[],
  now: number,
): void => {
  const viewEntries: TimelineViewEntry[] = viewEntriesIn;
  let veIndex: number = 0;
  debug('################__insertBlockedBlocksViewEntries()_START__################');
  debug(blockedBlocks.length + ' BLOCKS');

  blockedBlocks.forEach((blockedBlock, blockIndex) => {
    debug(`**********BB:${blockIndex}***********`);

    const viewEntriesToAdd: TimelineViewEntry[] = createViewEntriesForBlock(blockedBlock);

    if (veIndex > viewEntries.length) {
      throw new Error('INDEX TOO LARGE');
    }
    // we don't have any tasks to split any more so we just insert
    if (veIndex === viewEntries.length) {
      debug('JUST INSERT');
      viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
      veIndex += viewEntriesToAdd.length;
    }

    for (; veIndex < viewEntries.length; ) {
      const viewEntry = viewEntries[veIndex];
      debug(`------------ve:${veIndex}-------------`);
      debug(
        {
          BIndex: blockIndex,
          BStart: moment(blockedBlock.start).format('DD/MM H:mm'),
          BEnd: moment(blockedBlock.end).format('DD/MM H:mm'),
          BTypes: blockedBlock.entries.map((v) => v.type).join(', '),
          blockedBlock,
        },
        { veIndex, veStart: moment(viewEntry.start).format('DD/MM H:mm'), viewEntry },
        { viewEntriesLength: viewEntries.length },
        {
          viewEntries,
        },
      );
      debug(viewEntry.type + ': ' + (viewEntry as any)?.data?.title);

      // block before all tasks
      // => just insert
      if (blockedBlock.end <= viewEntry.start) {
        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        veIndex += viewEntriesToAdd.length;
        debug('AAA');
        break;
      }
      // block starts before task and lasts until after it starts
      // => move all following
      else if (blockedBlock.start <= viewEntry.start) {
        const currentListTaskStart = viewEntry.start;
        moveEntries(viewEntries, blockedBlock.end - currentListTaskStart, veIndex);
        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        veIndex += viewEntriesToAdd.length;
        debug('BBB');
        break;
      } else {
        const timeLeft = getTimeLeftForViewEntry(viewEntry);
        const veEnd = viewEntry.start + getTimeLeftForViewEntry(viewEntry);
        debug(blockedBlock.start < veEnd, blockedBlock.start, veEnd);

        // NOTE: blockedBlock.start > viewEntry.start is implicated by above checks
        // if (blockedBlock.start > viewEntry.start && blockedBlock.start < veEnd) {
        if (blockedBlock.start < veEnd) {
          debug('CCC split');
          debug('SPLIT', viewEntry.type, '---', (viewEntry as any)?.data?.title);

          if (isTaskDataType(viewEntry)) {
            debug('CCC a) ' + viewEntry.type);
            const currentViewEntry: TimelineViewEntryTask = viewEntry as any;
            const splitTask: TaskWithoutReminder =
              currentViewEntry.data as TaskWithoutReminder;

            const timeLeftOnTask = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitContinued =
              timeLeftOnTask - timePlannedForSplitStart;

            // update type of current
            currentViewEntry.type = TimelineViewEntryType.SplitTask;

            const newSplitContinuedEntry: TimelineViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: splitTask.id,
              timeToGo: timePlannedForSplitContinued,
              splitIndex: 0,
              title: splitTask.title,
            });

            // move entries
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);

            // insert new entries
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, newSplitContinuedEntry);
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAdd.length;
            break;
          } else if (isContinuedTaskType(viewEntry)) {
            debug('CCC b) ' + viewEntry.type);
            const currentViewEntry: TimelineViewEntrySplitTaskContinued =
              viewEntry as any;
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore =
              blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
                  entry.type === TimelineViewEntryType.SplitTaskContinued) &&
                entry.data.taskId === currentViewEntry.data.taskId,
            );
            // update type of current
            currentViewEntry.type = TimelineViewEntryType.SplitTaskContinued;
            currentViewEntry.data.timeToGo -= timePlannedForSplitTaskContinued;

            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: TimelineViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: currentViewEntry.data.taskId,
              timeToGo: timePlannedForSplitTaskContinued,
              splitIndex,
              title: currentViewEntry.data.title,
            });

            // move entries
            // NOTE: needed because view entries might not be ordered at this point of time for some reason
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveAllEntriesAfterTime(
              viewEntries,
              blockedBlockDuration,
              blockedBlock.start,
            );

            // insert new entries
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, newSplitContinuedEntry);
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAdd.length;
            break;
          } else {
            throw new Error('Invalid type given ' + viewEntry.type);
          }
        } else if (veIndex + 1 === viewEntries.length) {
          viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
          veIndex += viewEntriesToAdd.length + 1;
        } else {
          debug('DDD', veIndex, viewEntries.length);
          veIndex++;
        }
      }
    }
  });
  debug('################__insertBlockedBlocksViewEntries()_END__#################');
};

const createSplitTask = ({
  start,
  taskId,
  title,
  splitIndex,
  timeToGo,
}: {
  start: number;
  taskId: string;
  title: string;
  splitIndex: number;
  timeToGo: number;
}): TimelineViewEntrySplitTaskContinued => {
  return {
    id: `${taskId}__${splitIndex}`,
    start,
    type: TimelineViewEntryType.SplitTaskContinuedLast,
    data: {
      title,
      timeToGo,
      taskId,
      index: splitIndex,
    },
    isHideTime: false,
  };
};

const getTimeLeftForViewEntry = (viewEntry: TimelineViewEntry): number => {
  if (isTaskDataType(viewEntry)) {
    return getTimeLeftForTask((viewEntry as any).data as Task);
  } else if (isContinuedTaskType(viewEntry)) {
    return (viewEntry as TimelineViewEntrySplitTaskContinued).data.timeToGo;
    // } else if(viewEntry.type===TimelineViewEntryType.WorkdayEnd) {
    //   return viewEntry.data.
  }
  throw new Error('Wrong type given: ' + viewEntry.type);
};

const moveAllEntriesAfterTime = (
  viewEntries: TimelineViewEntry[],
  moveBy: number,
  startTime: number = 0,
): void => {
  viewEntries.forEach((viewEntry: any) => {
    if (viewEntry.start >= startTime && isMoveableViewEntry(viewEntry)) {
      debug(
        'MOVE_ENTRY2',
        viewEntry.data?.title,
        moment(viewEntry.start).format('DD/MM H:mm'),
        moment(viewEntry.start + moveBy).format('DD/MM H:mm'),
      );
      viewEntry.start = viewEntry.start + moveBy;
    }
  });
};

const moveEntries = (
  viewEntries: TimelineViewEntry[],
  moveBy: number,
  startIndex: number = 0,
): void => {
  for (let i = startIndex; i < viewEntries.length; i++) {
    const viewEntry: any = viewEntries[i];
    if (isMoveableViewEntry(viewEntry)) {
      debug(
        i,
        'MOVE_ENTRY',
        viewEntry.data?.title,
        moment(viewEntry.start).format('DD/MM H:mm'),
        moment(viewEntry.start + moveBy).format('DD/MM H:mm'),
      );
      viewEntry.start = viewEntry.start + moveBy;
    }
  }
};

const isTaskDataType = (viewEntry: TimelineViewEntry): boolean => {
  return (
    viewEntry.type === TimelineViewEntryType.Task ||
    viewEntry.type === TimelineViewEntryType.SplitTask ||
    viewEntry.type === TimelineViewEntryType.ScheduledTask
  );
};

const isContinuedTaskType = (viewEntry: TimelineViewEntry): boolean => {
  return (
    viewEntry.type === TimelineViewEntryType.SplitTaskContinued ||
    viewEntry.type === TimelineViewEntryType.SplitTaskContinuedLast
  );
};

const isMoveableViewEntry = (viewEntry: TimelineViewEntry): boolean => {
  return !!TIMELINE_MOVEABLE_TYPES.find(
    (moveableType) => moveableType === viewEntry.type,
  );
};
