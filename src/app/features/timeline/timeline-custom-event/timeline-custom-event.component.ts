import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { TimelineCustomEvent } from '../timeline.model';

@Component({
  selector: 'timeline-custom-event',
  templateUrl: './timeline-custom-event.component.html',
  styleUrls: ['./timeline-custom-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineCustomEventComponent implements OnInit {
  @Input() event: TimelineCustomEvent = {
    title: '',
    icon: '',
    start: 0,
    duration: 0,
  };

  constructor() {}

  ngOnInit(): void {}
}
