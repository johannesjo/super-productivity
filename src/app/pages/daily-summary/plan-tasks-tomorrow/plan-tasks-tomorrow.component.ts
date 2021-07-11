import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { TaskService } from '../../../features/tasks/task.service';
import { T } from 'src/app/t.const';
import { TaskPlanned } from '../../../features/tasks/task.model';
import { Observable } from 'rxjs';
import { TaskRepeatCfg } from '../../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TaskRepeatCfgService } from '../../../features/task-repeat-cfg/task-repeat-cfg.service';

@Component({
  selector: 'plan-tasks-tomorrow',
  templateUrl: './plan-tasks-tomorrow.component.html',
  styleUrls: ['./plan-tasks-tomorrow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    private _taskRepeatCfgService: TaskRepeatCfgService,
  ) {}

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  addAllPlannedToToday(plannedTasks: TaskPlanned[]) {
    plannedTasks.forEach((t) => {
      if (t.parentId) {
        this.taskService.moveToProjectTodayList(t.parentId);
        // NOTE: no unsubscribe on purpose as we always want this to run until done
        this.taskService.getByIdOnce$(t.parentId).subscribe((parentTask) => {
          this.taskService.addTodayTag(parentTask);
        });
      } else {
        this.taskService.moveToProjectTodayList(t.id);
        this.taskService.addTodayTag(t);
      }
    });
  }

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
  ) {
    if (plannedTasks.length) {
      this.addAllPlannedToToday(plannedTasks);
    }
    if (repeatableScheduledForTomorrow.length) {
      repeatableScheduledForTomorrow.forEach((repeatCfg) => {
        this._taskRepeatCfgService.createRepeatableTask(
          repeatCfg,
          this._tomorrow,
          this.taskService.currentTaskId,
        );
      });
    }
  }
}
