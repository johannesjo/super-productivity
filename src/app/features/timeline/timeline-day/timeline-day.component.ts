import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TimelineDay, TimelineViewEntry } from '../timeline.model';
import { T } from '../../../t.const';
import { TimelineViewEntryType } from '../timeline.const';
import { getTomorrow } from '../../../util/get-tomorrow';

@Component({
  selector: 'timeline-day',
  templateUrl: './timeline-day.component.html',
  styleUrl: './timeline-day.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineDayComponent {
  @Input({ required: true }) timelineDay!: TimelineDay;
  protected readonly T = T;
  protected readonly TimelineViewEntryType = TimelineViewEntryType;

  now: number = Date.now();
  tomorrow: number = getTomorrow(0).getTime();
  currentTaskId: string | null = null;

  getSizeClass(timelineEntry: TimelineViewEntry): string {
    // TODO fix that this is being reRendered on every hover
    const d =
      // @ts-ignore
      timelineEntry?.data?.timeEstimate ||
      // @ts-ignore
      timelineEntry?.data?.timeToGo ||
      // @ts-ignore
      timelineEntry?.data?.defaultEstimate;
    const h = d && d / 60 / 60 / 1000;

    // if (h && h >= 4.5) return 'xxxl row';
    if (h && h >= 3.5) return 'xxl row';
    if (h && h >= 2.5) return 'xl row';
    if (h && h >= 1.5) return 'l row';
    return 'row';
  }
}
