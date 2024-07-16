import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { TaskService } from '../../../features/tasks/task.service';
import { T } from 'src/app/t.const';
import { TaskRepeatCfgService } from '../../../features/task-repeat-cfg/task-repeat-cfg.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class PlanTasksTomorrowComponent {
  T: typeof T = T;

  constructor(
    public workContextService: WorkContextService,
    public taskService: TaskService,
    public _taskRepeatCfgService: TaskRepeatCfgService,
  ) {}
}
