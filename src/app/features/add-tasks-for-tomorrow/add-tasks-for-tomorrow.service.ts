import { Injectable } from '@angular/core';
import { TaskPlanned } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { sortRepeatableTaskCfgs } from '../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskService } from '../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';

@Injectable({
  providedIn: 'root',
})
export class AddTasksForTomorrowService {
  // plannedForTomorrow: Observable<TaskPlanned[]> =
  //   this._taskService.getPlannedTasksForTomorrow$();

  constructor(
    private _taskService: TaskService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
  ) {}

  async addAllPlannedToDayAndCreateRepeatable(
    plannedTasks: TaskPlanned[],
    repeatableScheduledForTomorrow: TaskRepeatCfg[],
    currentTaskId: string | null,
    targetDay: number,
  ): Promise<void> {
    if (plannedTasks.length) {
      await this._taskService.movePlannedTasksToToday(plannedTasks);
    }
    if (repeatableScheduledForTomorrow.length) {
      const promises = repeatableScheduledForTomorrow
        .sort(sortRepeatableTaskCfgs)
        .map((repeatCfg) => {
          return this._taskRepeatCfgService.createRepeatableTask(
            repeatCfg,
            targetDay,
            currentTaskId,
          );
        });
      await Promise.all(promises);
    }
  }
}
