import {
  SVE,
  SVERepeatProjection,
  SVERepeatProjectionSplitContinued,
  SVESplitTaskContinued,
  SVESplitTaskStart,
} from '../../schedule/schedule.model';
import moment from 'moment/moment';
import { TaskWithoutReminder } from '../../tasks/task.model';
import { SVEType } from '../../schedule/schedule.const';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { BlockedBlock } from '../../timeline/timeline.model';
import { getDurationForSVE } from './get-duration-for-schedule-view-entry';
import {
  isContinuedTaskType,
  isFlowableEntryVE,
  isTaskDataType,
} from './is-schedule-types-type';
import { createViewEntriesForBlock } from './create-view-entries-for-block';

// const debug = (...args: any): void => console.log(...args);
const debug = (...args: any): void => undefined;

export const insertBlockedBlocksViewEntriesForSchedule = (
  // viewEntriesIn: SVETask[],
  viewEntriesIn: SVE[],
  blockedBlocks: BlockedBlock[],
  now: number,
): void => {
  const viewEntries: SVE[] = viewEntriesIn;
  let veIndex: number = 0;
  debug('################__insertBlockedBlocksViewEntries()_START__################');
  debug(blockedBlocks.length + ' BLOCKS');
  debug('viewEntriesIn', JSON.parse(JSON.stringify(viewEntriesIn)));

  blockedBlocks.forEach((blockedBlock, blockIndex) => {
    debug(`**********BB:${blockIndex}***********`);

    const viewEntriesToAddForBB: SVE[] = createViewEntriesForBlock(blockedBlock);

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
        const timeLeft = getDurationForSVE(viewEntry);
        const veEnd = viewEntry.start + getDurationForSVE(viewEntry);
        debug(blockedBlock.start < veEnd, blockedBlock.start, veEnd);

        // NOTE: blockedBlock.start > viewEntry.start is implicated by above checks
        // if (blockedBlock.start > viewEntry.start && blockedBlock.start < veEnd) {
        if (blockedBlock.start < veEnd) {
          debug('CCC split');
          debug('SPLIT', viewEntry.type, '---', (viewEntry as any)?.data?.title);

          if (isTaskDataType(viewEntry)) {
            debug('CCC a) ' + viewEntry.type);

            const currentVE: SVESplitTaskStart =
              viewEntry as unknown as SVESplitTaskStart;
            const timeLeftOnTask = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentVE.start;
            const timePlannedForSplitContinued =
              timeLeftOnTask - timePlannedForSplitStart;
            currentVE.duration = timePlannedForSplitStart;

            const splitTask: TaskWithoutReminder = currentVE.data as TaskWithoutReminder;

            // update type of current
            currentVE.duration = timePlannedForSplitStart;
            currentVE.type = SVEType.SplitTask;

            const newSplitContinuedEntry: SVE = createSplitTask({
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
            const currentVE: SVESplitTaskContinued = viewEntry as any;
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore = blockedBlock.start - currentVE.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === SVEType.SplitTaskContinuedLast ||
                  entry.type === SVEType.SplitTaskContinued) &&
                entry.data.taskId === currentVE.data.taskId,
            );
            // update type of current
            currentVE.type = SVEType.SplitTaskContinued;
            currentVE.duration -= timePlannedForSplitTaskContinued;

            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: SVE = createSplitTask({
              start: blockedBlock.end,
              taskId: currentVE.data.taskId,
              projectId: currentVE.data.projectId,
              timeToGo: timePlannedForSplitTaskContinued,
              splitIndex,
              title: currentVE.data.title,
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
            viewEntry.type === SVEType.RepeatProjection ||
            viewEntry.type === SVEType.RepeatProjectionSplit
          ) {
            debug('CCC C) ' + viewEntry.type);
            const currentVE: SVERepeatProjection = viewEntry as SVERepeatProjection;
            const repeatCfg: TaskRepeatCfg = currentVE.data as TaskRepeatCfg;

            const timeLeftOnRepeatInstance = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentVE.start;
            const timePlannedForSplitContinued =
              timeLeftOnRepeatInstance - timePlannedForSplitStart;

            // update type of current
            // @ts-ignore
            currentVE.type = SVEType.RepeatProjectionSplit;

            const newSplitContinuedEntry: SVE = createSplitRepeat({
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
            viewEntry.type === SVEType.RepeatProjectionSplitContinued ||
            viewEntry.type === SVEType.RepeatProjectionSplitContinuedLast
          ) {
            debug('CCC D) ' + viewEntry.type);
            const currentVE: SVERepeatProjectionSplitContinued =
              viewEntry as SVERepeatProjectionSplitContinued;
            const timeLeftForCompleteSplitRepeatCfgProjection = timeLeft;
            const timePlannedForSplitRepeatCfgProjectionBefore =
              blockedBlock.start - currentVE.start;
            const timePlannedForSplitRepeatCfgProjectionContinued =
              timeLeftForCompleteSplitRepeatCfgProjection -
              timePlannedForSplitRepeatCfgProjectionBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === SVEType.RepeatProjectionSplitContinuedLast ||
                  entry.type === SVEType.RepeatProjectionSplitContinued) &&
                entry.data.repeatCfgId === currentVE.data.repeatCfgId,
            );
            // update type of current
            currentVE.type = SVEType.RepeatProjectionSplitContinued;
            currentVE.duration -= timePlannedForSplitRepeatCfgProjectionContinued;

            // TODO there can be multiple repeat instances on a day if they are continued to the next day
            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: SVE = createSplitRepeat({
              start: blockedBlock.end,
              repeatCfgId: currentVE.data.repeatCfgId,
              timeToGo: timePlannedForSplitRepeatCfgProjectionContinued,
              splitIndex,
              title: currentVE.data.title,
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
  viewEntries: SVE[],
  moveBy: number,
  startTime: number = 0,
): void => {
  viewEntries.forEach((viewEntry: any) => {
    if (viewEntry.start >= startTime && isFlowableEntryVE(viewEntry)) {
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
  viewEntries: SVE[],
  moveBy: number,
  startIndex: number = 0,
): void => {
  for (let i = startIndex; i < viewEntries.length; i++) {
    const viewEntry: any = viewEntries[i];
    if (isFlowableEntryVE(viewEntry)) {
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
}): SVESplitTaskContinued => {
  return {
    id: `${taskId}__${splitIndex}`,
    start,
    type: SVEType.SplitTaskContinuedLast,
    duration: timeToGo,
    data: {
      title,
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
}): SVERepeatProjectionSplitContinued => {
  return {
    id: `${repeatCfgId}__${splitIndex}`,
    start,
    type: SVEType.RepeatProjectionSplitContinuedLast,
    duration: timeToGo,
    data: {
      title,
      repeatCfgId,
      index: splitIndex,
    },
  };
};
