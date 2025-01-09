import { Injectable, inject } from '@angular/core';
import { TaskCopy, TaskPlanned } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { sortRepeatableTaskCfgs } from '../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { selectTasksPlannedForRangeNotOnToday } from '../tasks/store/task.selectors';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';
import { PlannerService } from '../planner/planner.service';
import { first, map, withLatestFrom } from 'rxjs/operators';
import { ScheduleItemTask, ScheduleItemType } from '../planner/planner.model';
import { selectTodayTaskIds } from '../work-context/store/work-context.selectors';
import { updateTaskTags } from '../tasks/store/task.actions';
import { TODAY_TAG } from '../tag/tag.const';

@Injectable({
  providedIn: 'root',
})
export class AddTasksForTomorrowService {
  private _plannerService = inject(PlannerService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _store = inject(Store);

  // plannedForTomorrow: Observable<TaskPlanned[]> =
  //   this._taskService.getPlannedTasksForTomorrow$();

  // NOTE: this should work fine as long as the user restarts the app every day
  // if not worst case is, that the buttons don't appear or today is shown as tomorrow
  allPlannedForTodayNotOnToday$: Observable<TaskPlanned[]> = this._store.pipe(
    select(selectTasksPlannedForRangeNotOnToday, getDateRangeForDay(Date.now())),
  );

  // eslint-disable-next-line no-mixed-operators
  private _tomorrow: number = Date.now() + 24 * 60 * 60 * 1000;
  repeatableScheduledForTomorrow$: Observable<TaskRepeatCfg[]> =
    this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnly$(this._tomorrow);

  nrOfPlannerItemsForTomorrow$: Observable<number> =
    this._plannerService.plannerDayForAllDueTomorrow$.pipe(
      withLatestFrom(this._store.select(selectTodayTaskIds)),
      map(([day, todaysTaskIds]) =>
        day
          ? day.scheduledIItems.filter(
              (scheduledItem) =>
                scheduledItem.type === ScheduleItemType.RepeatProjection ||
                (scheduledItem.type === ScheduleItemType.Task &&
                  !todaysTaskIds.includes(scheduledItem.task.id) &&
                  !(
                    scheduledItem.task.parentId &&
                    todaysTaskIds.includes(scheduledItem.task.parentId)
                  )),
            ).length +
            day.tasks.filter(
              (task) =>
                !todaysTaskIds.includes(task.id) &&
                !(task.parentId && todaysTaskIds.includes(task.parentId)),
            ).length +
            day.noStartTimeRepeatProjections.length
          : 0,
      ),
    );

  async addAllPlannedToDayAndCreateRepeatable(): Promise<void> {
    const dayData = await this._plannerService.plannerDayForAllDueTomorrow$
      .pipe(first())
      .toPromise();
    if (!dayData) {
      throw new Error('No day data found');
    }

    const tasksToSchedule = dayData.scheduledIItems
      .filter((item) => item.type === ScheduleItemType.Task)
      .map((item) => (item as ScheduleItemTask).task) as TaskPlanned[];

    if (tasksToSchedule.length) {
      this.movePlannedTasksToToday(tasksToSchedule);
    }
    if (dayData.tasks.length) {
      this.movePlannedTasksToToday(dayData.tasks);
    }
    const repeatableScheduledForTomorrow = await this.repeatableScheduledForTomorrow$
      .pipe(first())
      .toPromise();

    if (repeatableScheduledForTomorrow.length) {
      const promises = repeatableScheduledForTomorrow
        .sort(sortRepeatableTaskCfgs)
        .map((repeatCfg) => {
          return this._taskRepeatCfgService.createRepeatableTask(
            repeatCfg,
            this._tomorrow,
          );
        });

      await Promise.all(promises);
    }
  }

  movePlannedTasksToToday(plannedTasks: TaskCopy[]): void {
    plannedTasks.reverse().forEach((task) => {
      this._store.dispatch(
        updateTaskTags({ task, newTagIds: [TODAY_TAG.id, ...task.tagIds] }),
      );
    });
  }
}
