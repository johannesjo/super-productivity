import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { TaskService } from '../../../features/tasks/task.service';
import { T } from 'src/app/t.const';
import { TaskPlanned } from '../../../features/tasks/task.model';
import { Observable } from 'rxjs';
import { TaskRepeatCfg } from '../../../features/task-repeat-cfg/task-repeat-cfg.model';
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
  // eslint-disable-next-line no-mixed-operators
  private _tomorrow: number = Date.now() + 24 * 60 * 60 * 1000;
  repeatableScheduledForTomorrow$: Observable<TaskRepeatCfg[]> =
    this._taskRepeatCfgService.getRepeatTableTasksDueForDay$(this._tomorrow);

  constructor(
    public workContextService: WorkContextService,
    public taskService: TaskService,
    public _taskRepeatCfgService: TaskRepeatCfgService,
  ) {}

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
  ) {
    this._taskRepeatCfgService.addAllPlannedToDayAndCreateRepeatable(
      plannedTasks,
      repeatableScheduledForTomorrow,
      this.taskService.currentTaskId,
      this._tomorrow,
    );
  }
}
