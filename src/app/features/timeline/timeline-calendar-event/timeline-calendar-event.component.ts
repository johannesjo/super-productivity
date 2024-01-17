import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TimelineFromCalendarEvent } from '../timeline.model';

@Component({
  selector: 'timeline-calendarIntegration-event',
  templateUrl: './timeline-calendar-event.component.html',
  styleUrls: ['./timeline-calendar-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineCalendarEventComponent {
  @Input() calendarEvent?: TimelineFromCalendarEvent;

  constructor() {}
}
