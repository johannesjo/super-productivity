import { TimelineViewEntryType } from '../timeline/timeline.const';

export interface ScheduleEvent {
  title: string;
  type: TimelineViewEntryType;
  style: string;
}
