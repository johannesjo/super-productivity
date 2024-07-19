import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { TimelineViewEntrySplitTaskContinued } from '../timeline.model';
import { T } from 'src/app/t.const';

@Component({
  selector: 'timeline-continued-task',
  templateUrl: './timeline-continued-task.component.html',
  styleUrl: './timeline-continued-task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineContinuedTaskComponent {
  protected readonly T = T;

  @Input({ required: true }) splitTaskEntry!: TimelineViewEntrySplitTaskContinued;
  @Input()
  @HostBinding('class.last')
  isLast: boolean = false;
}
