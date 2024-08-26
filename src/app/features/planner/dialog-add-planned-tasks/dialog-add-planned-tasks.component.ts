import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { PlannerActions } from '../store/planner.actions';
import { select, Store } from '@ngrx/store';
import { first, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {
  selectTodayTaskIds,
  selectTodayTasksWithPlannedAndDoneSeperated,
} from '../../work-context/store/work-context.selectors';
import {
  selectTaskFeatureState,
  selectTasksById,
} from '../../tasks/store/task.selectors';
import { DateService } from '../../../core/date/date.service';
import { PlannerService } from '../planner.service';
import { combineLatest } from 'rxjs';
import { getAllMissingPlannedTaskIdsForDay } from '../util/get-all-missing-planned-task-ids-for-day';
import { TODAY_TAG } from '../../tag/tag.const';
import { ScheduleItemType } from '../planner.model';
import { TaskCopy } from '../../tasks/task.model';
import { ReminderCopy } from '../../reminder/reminder.model';
import { millisecondsDiffToRemindOption } from '../../tasks/util/remind-option-to-milliseconds';
import { TaskService } from '../../tasks/task.service';
import { ReminderService } from '../../reminder/reminder.service';
import { AddTasksForTomorrowService } from '../../add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';
import { DialogScheduleTaskComponent } from '../dialog-schedule-task/dialog-schedule-task.component';

@Component({
  selector: 'dialog-add-planned-tasks',
  templateUrl: './dialog-add-planned-tasks.component.html',
  styleUrl: './dialog-add-planned-tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddPlannedTasksComponent {
  T: typeof T = T;
  day$ = this._plannerService.plannerDayForAllDueToday$.pipe();
  protected readonly SCHEDULE_ITEM_TYPE = ScheduleItemType;

  private _missingTakIds$ = combineLatest(
    this.day$,
    this._store.pipe(select(selectTodayTaskIds)),
  ).pipe(
    map(([day, todayTaskIds]) => getAllMissingPlannedTaskIdsForDay(day, todayTaskIds)),
  );

  private _missingTasks$ = this._missingTakIds$.pipe(
    switchMap((taskIds) => {
      return this._store.select(selectTasksById, { ids: taskIds });
    }),
    // filter out missing tasks (e.g. deleted or archived)
    map((tasks) => tasks.filter((task) => !!task)),
  );

  constructor(
    private _matDialogRef: MatDialogRef<DialogAddPlannedTasksComponent>,
    private _plannerService: PlannerService,
    private _store: Store,
    private _dateService: DateService,
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _reminderService: ReminderService,
    private _addTasksForTomorrowService: AddTasksForTomorrowService,
  ) {
    // prevent close since it does not reappear
    _matDialogRef.disableClose = true;
  }

  dismiss(): void {
    this._store
      .select(selectTodayTasksWithPlannedAndDoneSeperated)
      .pipe(withLatestFrom(this._store.select(selectTaskFeatureState)), first())
      .subscribe(([{ planned, done, normal }, taskState]) => {
        this._store.dispatch(
          PlannerActions.cleanupOldAndUndefinedPlannerTasks({
            today: this._dateService.todayStr(),
            allTaskIds: taskState.ids as string[],
          }),
        );
        this._close();
      });
  }

  async addTasksToToday(): Promise<void> {
    const missingTasks = await this._missingTasks$.pipe(first()).toPromise();
    this._addTasksForTomorrowService.movePlannedTasksToToday(missingTasks);
    this._close();
  }

  private _close(): void {
    this._matDialogRef.close();
  }

  editTaskReminderOrReScheduleIfPossible(task: TaskCopy, newDay?: string): void {
    if (newDay) {
      const newDate = new Date(newDay);
      if (task.plannedAt && task.reminderId) {
        this._rescheduleTask(task, newDate);
        return;
      }
    }

    this._matDialog.open(DialogScheduleTaskComponent, {
      data: {
        task,
      },
    });
  }

  private _rescheduleTask(task: TaskCopy, newDate: Date): void {
    const taskPlannedAtDate = new Date(task.plannedAt as number);
    newDate.setHours(taskPlannedAtDate.getHours(), taskPlannedAtDate.getMinutes(), 0, 0);
    const reminder: ReminderCopy | undefined = task.reminderId
      ? this._reminderService.getById(task.reminderId) || undefined
      : undefined;
    const selectedReminderCfgId = millisecondsDiffToRemindOption(
      task.plannedAt as number,
      reminder?.remindAt,
    );
    const isToday = new Date().toDateString() === newDate.toDateString();
    this._taskService.scheduleTask(task, newDate.getTime(), selectedReminderCfgId, false);
    if (isToday) {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
    } else {
      this._taskService.updateTags(
        task,
        task.tagIds.filter((tid) => tid !== TODAY_TAG.id),
      );
    }
  }
}
