import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TimelineCustomEvent } from '../timeline.model';

@Component({
  selector: 'schedule-custom-event',
  templateUrl: './timeline-custom-event.component.html',
  styleUrls: ['./timeline-custom-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineCustomEventComponent {
  @Input() event: TimelineCustomEvent = {
    id: 'XXX',
    title: '',
    icon: '',
    start: 0,
    duration: 0,
  };

  constructor() {}
}
