import { BlockedBlock, BlockedBlockType } from '../../timeline/timeline.model';
import { SVE } from '../schedule.model';
import { SVEType } from '../schedule.const';
import { nanoid } from 'nanoid';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

export const createViewEntriesForBlock = (
  blockedBlock: BlockedBlock,
  dayDate: string,
): SVE[] => {
  const viewEntriesForBock: SVE[] = [];
  blockedBlock.entries.forEach((entry) => {
    if (entry.type === BlockedBlockType.ScheduledTask) {
      const scheduledTask = entry.data;
      viewEntriesForBock.push({
        // NOTE: should be unique
        id: scheduledTask.id,
        start: scheduledTask.plannedAt,
        type: SVEType.ScheduledTask,
        data: scheduledTask,
        duration: getTimeLeftForTask(scheduledTask),
      });
    } else if (entry.type === BlockedBlockType.ScheduledRepeatProjection) {
      const repeatCfg = entry.data;
      viewEntriesForBock.push({
        id: repeatCfg.id + '_' + dayDate,
        start: entry.start,
        type: SVEType.ScheduledRepeatProjection,
        data: repeatCfg,
        duration: repeatCfg.defaultEstimate || 0,
      });
    } else if (entry.type === BlockedBlockType.CalendarEvent) {
      const calendarEvent = entry.data;
      viewEntriesForBock.push({
        id: (calendarEvent.id || nanoid()) + '_' + dayDate,
        start: entry.start,
        type: SVEType.CalendarEvent,
        data: {
          ...calendarEvent,
          icon: calendarEvent.icon || 'event',
        },
        duration: calendarEvent.duration,
      });
    } else if (entry.type === BlockedBlockType.LunchBreak) {
      viewEntriesForBock.push({
        id: 'LUNCH_BREAK' + '_' + dayDate,
        start: entry.start,
        type: SVEType.LunchBreak,
        data: entry.data,
        duration: entry.end - entry.start,
      });
    }
  });
  viewEntriesForBock.sort((a, b) => a.start - b.start);

  return viewEntriesForBock;
};
