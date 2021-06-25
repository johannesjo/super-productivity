import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

@Component({
  selector: 'timeline-task-repeat-projection',
  templateUrl: './timeline-repeat-task-projection.component.html',
  styleUrls: ['./timeline-repeat-task-projection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineRepeatTaskProjectionComponent {
  @Input() repeatCfg?: TaskRepeatCfg;

  constructor() {}
}
