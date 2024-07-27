import { TimelineViewEntryType } from '../timeline/timeline.const';
import { TimelineViewEntry } from '../timeline/timeline.model';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: TimelineViewEntryType;
  style: string;
  startHours: number;
  timeLeftInHours: number;
  data?: TimelineViewEntry['data'];
}
