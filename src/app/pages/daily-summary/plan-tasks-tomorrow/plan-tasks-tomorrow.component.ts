import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  standalone: false,
})
export class PlanTasksTomorrowComponent {
  workContextService = inject(WorkContextService);
  taskService = inject(TaskService);
  _taskRepeatCfgService = inject(TaskRepeatCfgService);

  T: typeof T = T;
}
