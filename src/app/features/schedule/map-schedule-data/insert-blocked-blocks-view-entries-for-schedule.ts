import {
  ScheduleViewEntry,
  ScheduleViewEntryRepeatProjection,
  ScheduleViewEntryRepeatProjectionSplitContinued,
  ScheduleViewEntrySplitTaskContinued,
  ScheduleViewEntryTask,
} from '../../schedule/schedule.model';
import moment from 'moment/moment';
import { TaskWithoutReminder } from '../../tasks/task.model';
import { ScheduleViewEntryType } from '../../schedule/schedule.const';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { BlockedBlock } from '../../timeline/timeline.model';
import { getDurationForScheduleViewEntry } from './get-duration-for-schedule-view-entry';
import {
  isContinuedTaskType,
  isMoveableViewEntry,
  isTaskDataType,
} from './is-schedule-types-type';
import { createViewEntriesForBlock } from './create-view-entries-for-block';

// const debug = (...args: any): void => console.log(...args);
const debug = (...args: any): void => undefined;

export const insertBlockedBlocksViewEntriesForSchedule = (
  // viewEntriesIn: ScheduleViewEntryTask[],
  viewEntriesIn: ScheduleViewEntry[],
  blockedBlocks: BlockedBlock[],
  now: number,
): void => {
  const viewEntries: ScheduleViewEntry[] = viewEntriesIn;
  let veIndex: number = 0;
  debug('################__insertBlockedBlocksViewEntries()_START__################');
  debug(blockedBlocks.length + ' BLOCKS');
  debug('viewEntriesIn', JSON.parse(JSON.stringify(viewEntriesIn)));

  blockedBlocks.forEach((blockedBlock, blockIndex) => {
    debug(`**********BB:${blockIndex}***********`);

    const viewEntriesToAddForBB: ScheduleViewEntry[] =
      createViewEntriesForBlock(blockedBlock);

    if (veIndex > viewEntries.length) {
      throw new Error('INDEX TOO LARGE');
    }
    // we don't have any tasks to split anymore, so we just insert
    if (veIndex === viewEntries.length) {
      debug('JUST INSERT since no entries after');
      viewEntries.splice(veIndex, 0, ...viewEntriesToAddForBB);
      // skip to end of added entries
      veIndex += viewEntriesToAddForBB.length;
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
          viewEntriesToAddForBB,
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
        viewEntries.splice(veIndex, 0, ...viewEntriesToAddForBB);
        veIndex += viewEntriesToAddForBB.length;
        debug('AAA insert blocked block and skip index to after added entries');
        break;
      }
      // block starts before task and lasts until after it starts
      // => move all following
      else if (blockedBlock.start <= viewEntry.start) {
        const currentListTaskStart = viewEntry.start;
        moveEntries(viewEntries, blockedBlock.end - currentListTaskStart, veIndex);
        viewEntries.splice(veIndex, 0, ...viewEntriesToAddForBB);
        veIndex += viewEntriesToAddForBB.length;
        debug('BBB insert and move all following entries');
        break;
      } else {
        const timeLeft = getDurationForScheduleViewEntry(viewEntry);
        const veEnd = viewEntry.start + getDurationForScheduleViewEntry(viewEntry);
        debug(blockedBlock.start < veEnd, blockedBlock.start, veEnd);

        // NOTE: blockedBlock.start > viewEntry.start is implicated by above checks
        // if (blockedBlock.start > viewEntry.start && blockedBlock.start < veEnd) {
        if (blockedBlock.start < veEnd) {
          debug('CCC split');
          debug('SPLIT', viewEntry.type, '---', (viewEntry as any)?.data?.title);

          if (isTaskDataType(viewEntry)) {
            debug('CCC a) ' + viewEntry.type);
            const currentViewEntry: ScheduleViewEntryTask = viewEntry as any;
            const splitTask: TaskWithoutReminder =
              currentViewEntry.data as TaskWithoutReminder;

            const timeLeftOnTask = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitContinued =
              timeLeftOnTask - timePlannedForSplitStart;

            // update type of current
            currentViewEntry.type = ScheduleViewEntryType.SplitTask;

            const newSplitContinuedEntry: ScheduleViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: splitTask.id,
              projectId: splitTask.projectId,
              timeToGo: timePlannedForSplitContinued,
              splitIndex: 0,
              title: splitTask.title,
            });

            // move entries
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);

            // insert new entries
            viewEntries.splice(
              veIndex,
              0,
              ...viewEntriesToAddForBB,
              newSplitContinuedEntry,
            );
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAddForBB.length;
            break;
          } else if (isContinuedTaskType(viewEntry)) {
            debug('CCC b) ' + viewEntry.type);
            const currentViewEntry: ScheduleViewEntrySplitTaskContinued =
              viewEntry as any;
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore =
              blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === ScheduleViewEntryType.SplitTaskContinuedLast ||
                  entry.type === ScheduleViewEntryType.SplitTaskContinued) &&
                entry.data.taskId === currentViewEntry.data.taskId,
            );
            // update type of current
            currentViewEntry.type = ScheduleViewEntryType.SplitTaskContinued;
            currentViewEntry.data.timeToGo -= timePlannedForSplitTaskContinued;

            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: ScheduleViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: currentViewEntry.data.taskId,
              projectId: currentViewEntry.data.projectId,
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
            viewEntries.splice(
              veIndex,
              0,
              ...viewEntriesToAddForBB,
              newSplitContinuedEntry,
            );
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAddForBB.length;
            break;
          } else if (
            viewEntry.type === ScheduleViewEntryType.RepeatProjection ||
            viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplit
          ) {
            debug('CCC C) ' + viewEntry.type);
            const currentViewEntry: ScheduleViewEntryRepeatProjection =
              viewEntry as ScheduleViewEntryRepeatProjection;
            const repeatCfg: TaskRepeatCfg = currentViewEntry.data as TaskRepeatCfg;

            const timeLeftOnRepeatInstance = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitContinued =
              timeLeftOnRepeatInstance - timePlannedForSplitStart;

            // update type of current
            // @ts-ignore
            currentViewEntry.type = ScheduleViewEntryType.RepeatProjectionSplit;

            const newSplitContinuedEntry: ScheduleViewEntry = createSplitRepeat({
              start: blockedBlock.end,
              repeatCfgId: repeatCfg.id,
              timeToGo: timePlannedForSplitContinued,
              splitIndex: 0,
              title: repeatCfg.title || 'NO_TITLE',
            });

            // move entries
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);

            // insert new entries
            viewEntries.splice(
              veIndex,
              0,
              ...viewEntriesToAddForBB,
              newSplitContinuedEntry,
            );
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAddForBB.length;
            break;
          } else if (
            viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplitContinued ||
            viewEntry.type === ScheduleViewEntryType.RepeatProjectionSplitContinuedLast
          ) {
            debug('CCC D) ' + viewEntry.type);
            const currentViewEntry: ScheduleViewEntryRepeatProjectionSplitContinued =
              viewEntry as ScheduleViewEntryRepeatProjectionSplitContinued;
            const timeLeftForCompleteSplitRepeatCfgProjection = timeLeft;
            const timePlannedForSplitRepeatCfgProjectionBefore =
              blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitRepeatCfgProjectionContinued =
              timeLeftForCompleteSplitRepeatCfgProjection -
              timePlannedForSplitRepeatCfgProjectionBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type ===
                  ScheduleViewEntryType.RepeatProjectionSplitContinuedLast ||
                  entry.type === ScheduleViewEntryType.RepeatProjectionSplitContinued) &&
                entry.data.repeatCfgId === currentViewEntry.data.repeatCfgId,
            );
            // update type of current
            currentViewEntry.type = ScheduleViewEntryType.RepeatProjectionSplitContinued;
            currentViewEntry.data.timeToGo -=
              timePlannedForSplitRepeatCfgProjectionContinued;

            // TODO there can be multiple repeat instances on a day if they are continued to the next day
            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: ScheduleViewEntry = createSplitRepeat({
              start: blockedBlock.end,
              repeatCfgId: currentViewEntry.data.repeatCfgId,
              timeToGo: timePlannedForSplitRepeatCfgProjectionContinued,
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
            viewEntries.splice(
              veIndex,
              0,
              ...viewEntriesToAddForBB,
              newSplitContinuedEntry,
            );
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAddForBB.length;
            break;
          } else {
            throw new Error('Invalid type given ' + viewEntry.type);
          }
        } else if (veIndex + 1 === viewEntries.length) {
          debug('DDD', veIndex, viewEntries.length, viewEntries[veIndex]);
          viewEntries.splice(veIndex, 0, ...viewEntriesToAddForBB);
          veIndex += viewEntriesToAddForBB.length + 1;
        } else {
          debug(
            'EEEE insert, since entry ends before blocked block',
            veIndex,
            viewEntries.length,
            viewEntries[veIndex],
          );
          veIndex++;
        }
      }
    }
  });
  debug('################__insertBlockedBlocksViewEntries()_END__#################');
};

const moveAllEntriesAfterTime = (
  viewEntries: ScheduleViewEntry[],
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
  viewEntries: ScheduleViewEntry[],
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

const createSplitTask = ({
  start,
  taskId,
  projectId,
  title,
  splitIndex,
  timeToGo,
}: {
  start: number;
  taskId: string;
  projectId: string | null;
  title: string;
  splitIndex: number;
  timeToGo: number;
}): ScheduleViewEntrySplitTaskContinued => {
  return {
    id: `${taskId}__${splitIndex}`,
    start,
    type: ScheduleViewEntryType.SplitTaskContinuedLast,
    data: {
      title,
      timeToGo,
      taskId,
      projectId,
      index: splitIndex,
    },
  };
};

const createSplitRepeat = ({
  start,
  repeatCfgId,
  title,
  splitIndex,
  timeToGo,
}: {
  start: number;
  repeatCfgId: string;
  title: string;
  splitIndex: number;
  timeToGo: number;
}): ScheduleViewEntryRepeatProjectionSplitContinued => {
  return {
    id: `${repeatCfgId}__${splitIndex}`,
    start,
    type: ScheduleViewEntryType.RepeatProjectionSplitContinuedLast,
    data: {
      title,
      timeToGo,
      repeatCfgId,
      index: splitIndex,
    },
  };
};
