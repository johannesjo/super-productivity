import { TimelineDay, TimelineViewEntry } from '../timeline.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { TimelineViewEntryType } from '../timeline.const';

export const mapTimelineEntriesToDays = (
  timelineEntries: TimelineViewEntry[],
): TimelineDay[] => {
  const timelineDays: TimelineDay[] = [];
  // TODO use dateService here
  const todayStr = getWorklogStr();
  let currentDayDate = todayStr;
  let entriesForCurrentDay: TimelineViewEntry[] = [];

  timelineEntries.forEach((entry) => {
    if (entry.type === TimelineViewEntryType.DayCrossing) {
      timelineDays.push({
        dayDate: currentDayDate,
        entries: entriesForCurrentDay,
        isToday: currentDayDate === todayStr,
      });
      entriesForCurrentDay = [];
      currentDayDate = getWorklogStr(entry.start);
    } else {
      entriesForCurrentDay.push(entry);
    }
  });

  return timelineDays;
};
