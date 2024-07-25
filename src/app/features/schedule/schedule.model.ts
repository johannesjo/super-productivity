import { TimelineViewEntryType } from '../timeline/timeline.const';
import { TimelineViewEntry } from '../timeline/timeline.model';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: TimelineViewEntryType;
  style: string;
  data?: TimelineViewEntry['data'];
}
