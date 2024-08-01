import { Injectable } from '@angular/core';
import { TaskCopy, TaskPlanned } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { sortRepeatableTaskCfgs } from '../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskService } from '../tasks/task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { selectTasksPlannedForRangeNotOnToday } from '../tasks/store/task.selectors';
import { getDateRangeForDay } from '../../util/get-date-range-for-day';
import { PlannerService } from '../planner/planner.service';
import { first, map, tap, withLatestFrom } from 'rxjs/operators';
import { PlannerDay, ScheduleItemTask, ScheduleItemType } from '../planner/planner.model';
import { selectTodayTaskIds } from '../work-context/store/work-context.selectors';
import { ProjectService } from '../project/project.service';

@Injectable({
  providedIn: 'root',
})
export class AddTasksForTomorrowService {
  // plannedForTomorrow: Observable<TaskPlanned[]> =
  //   this._taskService.getPlannedTasksForTomorrow$();

  // NOTE: this should work fine as long as the user restarts the app every day
  // if not worst case is, that the buttons don't appear or today is shown as tomorrow
  allPlannedForTomorrowNotOnToday$: Observable<TaskPlanned[]> = this._store.pipe(
    select(
      selectTasksPlannedForRangeNotOnToday,
      // eslint-disable-next-line no-mixed-operators
      getDateRangeForDay(Date.now() + 24 * 60 * 60 * 1000),
    ),
  );

  // NOTE: this should work fine as long as the user restarts the app every day
  // if not worst case is, that the buttons don't appear or today is shown as tomorrow
  allPlannedForTodayNotOnToday$: Observable<TaskPlanned[]> = this._store.pipe(
    select(selectTasksPlannedForRangeNotOnToday, getDateRangeForDay(Date.now())),
  );

  // eslint-disable-next-line no-mixed-operators
  private _tomorrow: number = Date.now() + 24 * 60 * 60 * 1000;
  repeatableScheduledForTomorrow$: Observable<TaskRepeatCfg[]> =
    this._taskRepeatCfgService.getRepeatTableTasksDueForDayOnly$(this._tomorrow);

  plannerDayTomorrow$: Observable<PlannerDay | null> =
    this._plannerPlanViewService.days$.pipe(map((days) => (days[1] ? days[1] : null)));

  nrOfPlannerItemsForTomorrow$: Observable<number> = this.plannerDayTomorrow$.pipe(
    withLatestFrom(this._store.select(selectTodayTaskIds)),
    tap(console.log),
    map(([day, todaysTaskIds]) =>
      day
        ? day.scheduledIItems.filter(
            (scheduledItem) =>
              scheduledItem.type !== ScheduleItemType.Task ||
              (!todaysTaskIds.includes(scheduledItem.task.id) &&
                !todaysTaskIds.includes(scheduledItem.task.parentId)),
          ).length +
          day.tasks.filter(
            (task) =>
              !todaysTaskIds.includes(task.id) && !todaysTaskIds.includes(task.parentId),
          ).length +
          day.noStartTimeRepeatProjections.length
        : 0,
    ),
  );

  constructor(
    private _taskService: TaskService,
    private _plannerPlanViewService: PlannerService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _store: Store,
    private _projectService: ProjectService,
  ) {}

  async addAllPlannedToDayAndCreateRepeatable(): Promise<void> {
    const dayData = await this.plannerDayTomorrow$.pipe(first()).toPromise();
    if (!dayData) {
      throw new Error('No day data found');
    }

    const tasksToSchedule = dayData.scheduledIItems
      .filter((item) => item.type === ScheduleItemType.Task)
      .map((item) => (item as ScheduleItemTask).task) as TaskPlanned[];

    if (tasksToSchedule.length) {
      await this.movePlannedTasksToToday(tasksToSchedule);
    }
    if (dayData.tasks.length) {
      await this.movePlannedTasksToToday(dayData.tasks);
    }
    const repeatableScheduledForTomorrow = await this.repeatableScheduledForTomorrow$
      .pipe(first())
      .toPromise();

    if (repeatableScheduledForTomorrow.length) {
      console.log(repeatableScheduledForTomorrow);

      const promises = repeatableScheduledForTomorrow
        .sort(sortRepeatableTaskCfgs)
        .map((repeatCfg) => {
          return this._taskRepeatCfgService.createRepeatableTask(
            repeatCfg,
            this._tomorrow,
          );
        });
      console.log(promises);

      await Promise.all(promises);
    }
  }

  async movePlannedTasksToToday(plannedTasks: TaskCopy[]): Promise<unknown> {
    return Promise.all(
      plannedTasks.map(async (t) => {
        // if (t.parentId) {
        //   if (t.projectId) {
        //     this._projectService.moveTaskToTodayList(t.parentId, t.projectId);
        //   }
        //   const parentTask = await this._taskService.getByIdOnce$(t.parentId).toPromise();
        //   this._taskService.addTodayTag(parentTask);
        // } else {
        if (t.projectId) {
          this._projectService.moveTaskToTodayList(t.id, t.projectId);
        }
        this._taskService.addTodayTag(t);
        // }
      }),
    );
  }
}
