import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { TimelineViewEntryRepeatProjectionSplitContinued } from '../timeline.model';
import { T } from 'src/app/t.const';

@Component({
  selector: 'schedule-repeat-task-projection-continued',
  templateUrl: './timeline-repeat-task-projection-continued.component.html',
  styleUrl: './timeline-repeat-task-projection-continued.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineRepeatTaskProjectionContinuedComponent {
  protected readonly T = T;

  @Input({ required: true })
  splitRepeatEntry!: TimelineViewEntryRepeatProjectionSplitContinued;
  @Input()
  @HostBinding('class.last')
  isLast: boolean = false;
}
