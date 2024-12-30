import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
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
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { MatIcon } from '@angular/material/icon';
import { PlannerTaskComponent } from '../planner-task/planner-task.component';
import { PlannerRepeatProjectionComponent } from '../planner-repeat-projection/planner-repeat-projection.component';
import { AddTaskInlineComponent } from '../add-task-inline/add-task-inline.component';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { PlannerCalendarEventComponent } from '../planner-calendar-event/planner-calendar-event.component';
import { MatButton } from '@angular/material/button';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { RoundDurationPipe } from '../../../ui/pipes/round-duration.pipe';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-add-planned-tasks',
  templateUrl: './dialog-add-planned-tasks.component.html',
  styleUrl: './dialog-add-planned-tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatIcon,
    PlannerTaskComponent,
    PlannerRepeatProjectionComponent,
    AddTaskInlineComponent,
    NgClass,
    PlannerCalendarEventComponent,
    MatDialogActions,
    MatButton,
    AsyncPipe,
    DatePipe,
    MsToStringPipe,
    RoundDurationPipe,
    TranslatePipe,
  ],
})
export class DialogAddPlannedTasksComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogAddPlannedTasksComponent>>(MatDialogRef);
  private _plannerService = inject(PlannerService);
  private _store = inject(Store);
  private _dateService = inject(DateService);
  private _matDialog = inject(MatDialog);
  private _taskService = inject(TaskService);
  private _reminderService = inject(ReminderService);
  private _addTasksForTomorrowService = inject(AddTasksForTomorrowService);

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

  constructor() {
    const _matDialogRef = this._matDialogRef;

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
      const newDate = dateStrToUtcDate(newDay);
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
