import { BlockedBlock, BlockedBlockType } from '../../timeline/timeline.model';
import { ScheduleViewEntry } from '../schedule.model';
import {
  SCHEDULE_TASK_MIN_DURATION_IN_MS,
  ScheduleViewEntryType,
} from '../schedule.const';
import { nanoid } from 'nanoid';
import { getTimeLeftForTaskWithMinVal } from '../../../util/get-time-left-for-task';

export const createViewEntriesForBlock = (
  blockedBlock: BlockedBlock,
): ScheduleViewEntry[] => {
  const viewEntriesForBock: ScheduleViewEntry[] = [];
  blockedBlock.entries.forEach((entry) => {
    if (entry.type === BlockedBlockType.ScheduledTask) {
      const scheduledTask = entry.data;
      viewEntriesForBock.push({
        id: scheduledTask.id,
        start: scheduledTask.plannedAt,
        type: ScheduleViewEntryType.ScheduledTask,
        data: scheduledTask,
        timeToGo: getTimeLeftForTaskWithMinVal(
          scheduledTask,
          SCHEDULE_TASK_MIN_DURATION_IN_MS,
        ),
      });
    } else if (entry.type === BlockedBlockType.ScheduledRepeatProjection) {
      const repeatCfg = entry.data;
      viewEntriesForBock.push({
        id: repeatCfg.id,
        start: entry.start,
        type: ScheduleViewEntryType.ScheduledRepeatProjection,
        data: repeatCfg,
        timeToGo: repeatCfg.defaultEstimate || 0,
      });
    } else if (entry.type === BlockedBlockType.CalendarEvent) {
      const calendarEvent = entry.data;
      viewEntriesForBock.push({
        // TODO fix
        // id: calendarEvent.title,
        id: nanoid(),
        start: entry.start,
        type: ScheduleViewEntryType.CalendarEvent,
        data: {
          ...calendarEvent,
          icon: calendarEvent.icon || 'event',
        },
        timeToGo: calendarEvent.duration,
      });
      // TODO check if needed
    } else if (entry.type === BlockedBlockType.WorkdayStartEnd) {
      // NOTE: day start and end are mixed up, because it is the opposite as the blocked range

      const workdayCfg = entry.data;
      viewEntriesForBock.push({
        id: 'DAY_END_' + entry.start,
        start: entry.start,
        type: ScheduleViewEntryType.WorkdayEnd,
        data: workdayCfg,
        timeToGo: entry.end - entry.start,
      });
      viewEntriesForBock.push({
        id: 'DAY_START_' + entry.end,
        start: entry.end,
        type: ScheduleViewEntryType.WorkdayStart,
        data: workdayCfg,
        timeToGo: 0,
      });
    } else if (entry.type === BlockedBlockType.LunchBreak) {
      viewEntriesForBock.push({
        id: 'LUNCH_BREAK_' + entry.start,
        start: entry.start,
        type: ScheduleViewEntryType.LunchBreak,
        data: entry.data,
        timeToGo: entry.end - entry.start,
      });
    }
  });
  viewEntriesForBock.sort((a, b) => a.start - b.start);

  return viewEntriesForBock;
};
