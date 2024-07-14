import { ChangeDetectionStrategy, Component } from '@angular/core';
import { T } from '../../../t.const';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { AddTasksForTomorrowService } from '../add-tasks-for-tomorrow.service';
import { Observable } from 'rxjs';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { TaskPlanned } from '../../tasks/task.model';

@Component({
  selector: 'add-scheduled-for-tomorrow',
  standalone: true,
  imports: [AsyncPipe, MatButton, MatIcon, NgIf, TranslateModule],
  templateUrl: './add-scheduled-today-or-tomorrow-btn.component.html',
  styleUrl: './add-scheduled-today-or-tomorrow-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddScheduledTodayOrTomorrowBtnComponent {
  // eslint-disable-next-line no-mixed-operators
  private _tomorrow: number = Date.now() + 24 * 60 * 60 * 1000;
  repeatableScheduledForTomorrow$: Observable<TaskRepeatCfg[]> =
    this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnly$(this._tomorrow);

  protected readonly T = T;

  constructor(
    public workContextService: WorkContextService,
    public taskService: TaskService,
    public _taskRepeatCfgService: TaskRepeatCfgService,
    private _addTasksForTomorrowService: AddTasksForTomorrowService,
  ) {}

  // NOTE: there is a duplicate of this in plan-tasks-tomorrow.component
  addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
  ): void {
    this._addTasksForTomorrowService.addAllPlannedToDayAndCreateRepeatable(
      plannedTasks,
      repeatableScheduledForTomorrow,
      this.taskService.currentTaskId,
      this._tomorrow,
    );
  }
}
