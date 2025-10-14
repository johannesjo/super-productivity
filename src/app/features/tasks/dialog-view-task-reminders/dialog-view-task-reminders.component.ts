import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { Reminder } from '../../reminder/reminder.model';
import { Task, TaskWithReminderData } from '../task.model';
import { TaskService } from '../task.service';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { first, map, switchMap, takeWhile } from 'rxjs/operators';
import { T } from '../../../t.const';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { getTomorrow } from '../../../util/get-tomorrow';
import { ProjectService } from '../../project/project.service';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TagListComponent } from '../../tag/tag-list/tag-list.component';
import { Store } from '@ngrx/store';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { PlannerActions } from '../../planner/store/planner.actions';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { selectTodayTagTaskIds } from '../../tag/store/tag.reducer';

const MINUTES_TO_MILLISECONDS = 1000 * 60;

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminders.component.html',
  styleUrls: ['./dialog-view-task-reminders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  imports: [
    MatDialogTitle,
    MatIcon,
    MatDialogContent,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatDialogActions,
    MatButton,
    AsyncPipe,
    TranslatePipe,
    TagListComponent,
    DatePipe,
  ],
})
export class DialogViewTaskRemindersComponent implements OnDestroy {
  private _matDialogRef =
    inject<MatDialogRef<DialogViewTaskRemindersComponent>>(MatDialogRef);
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _matDialog = inject(MatDialog);
  private _store = inject(Store);
  private _reminderService = inject(ReminderService);
  data = inject<{
    reminders: Reminder[];
  }>(MAT_DIALOG_DATA);

  T: typeof T = T;
  isDisableControls: boolean = false;
  reminders$: BehaviorSubject<Reminder[]> = new BehaviorSubject(this.data.reminders);
  tasks$: Observable<TaskWithReminderData[]> = this.reminders$.pipe(
    switchMap((reminders) =>
      this._taskService.getByIdsLive$(reminders.map((r) => r.relatedId)).pipe(
        first(),
        map((tasks: Task[]) =>
          tasks
            .filter((task) => !!task)
            .map(
              (task): TaskWithReminderData => ({
                ...task,
                reminderData: reminders.find((r) => r.relatedId === task.id) as Reminder,
              }),
            ),
        ),
      ),
    ),
  );
  isSingleOnToday$: Observable<boolean> = combineLatest([
    this.tasks$,
    this._store.select(selectTodayTagTaskIds),
  ]).pipe(
    map(
      ([tasks, todayTaskIds]) =>
        tasks.length === 1 && tasks[0] && todayTaskIds.includes(tasks[0].id),
    ),
  );
  isMultiple$: Observable<boolean> = this.tasks$.pipe(
    map((tasks) => tasks.length > 1),
    takeWhile((isMultiple) => !isMultiple, true),
  );
  isMultiple: boolean = false;
  // eslint-disable-next-line no-mixed-operators
  overdueThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes

  private _subs: Subscription = new Subscription();

  constructor() {
    // this._matDialogRef.disableClose = true;
    this._subs.add(
      this._reminderService.onReloadModel$.subscribe(() => {
        this._close();
      }),
    );
    this._subs.add(
      this._reminderService.onRemindersActive$.subscribe((reminders) => {
        this.reminders$.next(reminders);
      }),
    );
    this._subs.add(
      this.isMultiple$.subscribe((isMultiple) => (this.isMultiple = isMultiple)),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  async addToToday(task: TaskWithReminderData): Promise<void> {
    this._store.dispatch(
      TaskSharedActions.planTasksForToday({
        taskIds: [task.id],
        parentTaskMap: {
          [task.id]: task.parentId,
        },
      }),
    );
    if (task.reminderId) {
      this._removeReminderFromList(task.reminderId as string);
    }
  }

  dismiss(task: TaskWithReminderData): void {
    // const now = Date.now();
    if (task.projectId || task.parentId || task.tagIds.length > 0) {
      this._store.dispatch(
        TaskSharedActions.unscheduleTask({
          id: task.id,
          reminderId: task.reminderId as string,
        }),
      );
      this._removeReminderFromList(task.reminderId as string);
    }
  }

  dismissReminderOnly(task: TaskWithReminderData): void {
    if (task.reminderId) {
      this._store.dispatch(
        TaskSharedActions.dismissReminderOnly({
          id: task.id,
          reminderId: task.reminderId as string,
        }),
      );
      this._removeReminderFromList(task.reminderId as string);
    }
  }

  snooze(task: TaskWithReminderData, snoozeInMinutes: number): void {
    this._reminderService.updateReminder(task.reminderData.id, {
      // prettier-ignore
      remindAt: Date.now() + (snoozeInMinutes * MINUTES_TO_MILLISECONDS),
    });
    this._removeReminderFromList(task.reminderId as string);
  }

  planForTomorrow(task: TaskWithReminderData): void {
    this._store.dispatch(
      PlannerActions.planTaskForDay({
        task,
        day: getDbDateStr(getTomorrow()),
        isShowSnack: true,
      }),
    );
    this._removeReminderFromList(task.reminderId as string);
  }

  editReminder(task: TaskWithReminderData, isCloseAfter: boolean = false): void {
    this._subs.add(
      this._matDialog
        .open(DialogScheduleTaskComponent, {
          restoreFocus: true,
          data: { task },
        })
        .afterClosed()
        .subscribe((wasEdited) => {
          if (wasEdited) {
            this._removeReminderFromList(task.reminderId as string);
          }
          if (isCloseAfter) {
            this._close();
          }
        }),
    );
  }

  trackById(i: number, task: Task): string {
    return task.id;
  }

  // ALL ACTIONS
  // ------------
  snoozeAll(snoozeInMinutes: number): void {
    this._prepareForBulkAction();
    this.reminders$.getValue().forEach((reminder) => {
      this._reminderService.updateReminder(reminder.id, {
        // prettier-ignore
        remindAt: Date.now() + (snoozeInMinutes * MINUTES_TO_MILLISECONDS),
      });
    });
    this._finalizeBulkAction();
  }

  rescheduleAllUntilTomorrow(): void {
    this._prepareForBulkAction();
    this._subs.add(
      this.tasks$.pipe(first()).subscribe((tasks) => {
        tasks.forEach((t) => this.planForTomorrow(t));
        this._finalizeBulkAction();
      }),
    );
  }

  markSingleAsDone(): void {
    this._subs.add(
      this.tasks$.pipe(first()).subscribe((tasks) => {
        if (tasks.length === 1) {
          this._taskService.setDone(tasks[0].id);
          this._finalizeBulkAction();
        }
      }),
    );
  }

  async addAllToToday(): Promise<void> {
    this._prepareForBulkAction();
    const selectedTasks = await this._getTasksFromReminderList();

    this._store.dispatch(
      TaskSharedActions.planTasksForToday({
        taskIds: selectedTasks.map((t) => t.id),
        parentTaskMap: selectedTasks.reduce((acc, next: Task) => {
          return { ...acc, [next.id as string]: next.parentId };
        }, {}),
        isShowSnack: true,
      }),
    );

    this._finalizeBulkAction();
  }

  async dismissAll(): Promise<void> {
    this._prepareForBulkAction();
    const tasks = await this._getTasksFromReminderList();
    tasks.forEach((task) => {
      if (task.projectId || task.parentId || task.tagIds.length > 0) {
        this.dismiss(task);
      }
    });
    this._finalizeBulkAction();
  }

  async dismissAllRemindersOnly(): Promise<void> {
    this._prepareForBulkAction();
    const tasks = await this._getTasksFromReminderList();
    tasks.forEach((task) => {
      this.dismissReminderOnly(task);
    });
    this._finalizeBulkAction();
  }

  async play(): Promise<void> {
    const tasks = await this.tasks$.pipe(first()).toPromise();
    if (tasks.length !== 1) {
      throw new Error('More or less than one task');
    }
    this.isDisableControls = true;

    const task = tasks[0];
    if (task.projectId) {
      if (task.parentId) {
        this._projectService.moveTaskToTodayList(task.parentId, task.projectId, true);
      } else {
        this._projectService.moveTaskToTodayList(task.id, task.projectId, true);
      }
    }
    this._taskService.setCurrentId(task.id);
    this.dismiss(task);
  }

  markTaskAsDone(task: TaskWithReminderData): void {
    this._taskService.setDone(task.id);
    if (task.reminderId) {
      this._removeReminderFromList(task.reminderId as string);
    }
  }

  async markAllAsDone(): Promise<void> {
    await this.markAllTasksAsDone();
  }

  async markAllTasksAsDone(): Promise<void> {
    this._prepareForBulkAction();
    const tasks = await this._getTasksFromReminderList();
    tasks.forEach((task) => {
      this._taskService.setDone(task.id);
    });
    this._finalizeBulkAction();
  }

  private _close(): void {
    this._matDialogRef.close();
  }

  private _removeReminderFromList(reminderId: string): void {
    const newReminders = this.reminders$
      .getValue()
      .filter((reminder) => reminder.id !== reminderId);
    if (newReminders.length <= 0) {
      this._close();
    } else {
      this.reminders$.next(newReminders);
    }
  }

  private async _getTasksFromReminderList(): Promise<TaskWithReminderData[]> {
    return (await this.tasks$.pipe(first()).toPromise()) as TaskWithReminderData[];
  }

  private _prepareForBulkAction(): void {
    this.isDisableControls = true;
  }

  private _finalizeBulkAction(): void {
    this._close();
  }
}
