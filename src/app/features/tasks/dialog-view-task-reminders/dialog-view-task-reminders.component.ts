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
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { first, map, switchMap, takeWhile } from 'rxjs/operators';
import { T } from '../../../t.const';
import { TODAY_TAG } from '../../tag/tag.const';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { unique } from '../../../util/unique';
import { getTomorrow } from '../../../util/get-tomorrow';
import { uniqueByProp } from '../../../util/unique-by-prop';
import { ProjectService } from '../../project/project.service';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TagListComponent } from '../../tag/tag-list/tag-list.component';

const M = 1000 * 60;

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
  ],
})
export class DialogViewTaskRemindersComponent implements OnDestroy {
  private _matDialogRef =
    inject<MatDialogRef<DialogViewTaskRemindersComponent>>(MatDialogRef);
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _matDialog = inject(MatDialog);
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
  isSingleOnToday$: Observable<boolean> = this.tasks$.pipe(
    map(
      (tasks) => tasks.length === 1 && tasks[0] && tasks[0].tagIds.includes(TODAY_TAG.id),
    ),
  );
  isMultiple$: Observable<boolean> = this.tasks$.pipe(
    map((tasks) => tasks.length > 1),
    takeWhile((isMultiple) => !isMultiple, true),
  );
  isMultiple: boolean = false;

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
    // NOTE: we need to account for the parent task as well
    if (task.parentId) {
      const parent = await this._taskService
        .getByIdOnce$(task.parentId)
        .pipe(first())
        .toPromise();
      this._taskService.updateTags(parent, [TODAY_TAG.id, ...parent.tagIds]);
      this.dismiss(task);
    } else {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
      this.dismiss(task);
    }
  }

  dismiss(task: TaskWithReminderData): void {
    if (task.projectId || task.parentId || task.tagIds.length > 0) {
      this._taskService.update(task.id, {
        reminderId: undefined,
        plannedAt: undefined,
      });
      this._reminderService.removeReminder(task.reminderData.id);
      this._removeFromList(task.reminderId as string);
    }
  }

  snooze(task: TaskWithReminderData, snoozeInMinutes: number): void {
    this._reminderService.updateReminder(task.reminderData.id, {
      // prettier-ignore
      remindAt: Date.now() + (snoozeInMinutes * M),
    });
    this._removeFromList(task.reminderId as string);
  }

  rescheduleUntilTomorrow(task: TaskWithReminderData): void {
    const remindTime = getTomorrow().getTime();
    this._reminderService.updateReminder(task.reminderData.id, {
      remindAt: getTomorrow().getTime(),
    });
    this._taskService.update(task.id, {
      plannedAt: remindTime,
    });
    this._removeFromList(task.reminderId as string);
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
            this._removeFromList(task.reminderId as string);
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
    this.isDisableControls = true;
    this.reminders$.getValue().forEach((reminder) => {
      this._reminderService.updateReminder(reminder.id, {
        // prettier-ignore
        remindAt: Date.now() + (snoozeInMinutes * M),
      });
    });
    this._close();
  }

  rescheduleAllUntilTomorrow(): void {
    this.isDisableControls = true;
    this._subs.add(
      this.tasks$.pipe(first()).subscribe((tasks) => {
        tasks.forEach((t) => this.rescheduleUntilTomorrow(t));
        this._close();
      }),
    );
  }

  markAsDone(): void {
    this._subs.add(
      this.tasks$.pipe(first()).subscribe((tasks) => {
        if (tasks.length === 1) {
          this._taskService.setDone(tasks[0].id);
          this._close();
        }
      }),
    );
  }

  async addAllToToday(): Promise<void> {
    this.isDisableControls = true;
    const tasksToDismiss = (await this.tasks$
      .pipe(first())
      .toPromise()) as TaskWithReminderData[];
    const mainTasks = tasksToDismiss.filter((t) => !t.parentId);
    const parentIds: string[] = unique<string>(
      tasksToDismiss.map((t) => t.parentId as string).filter((pid) => !!pid),
    );
    const parents = await Promise.all(
      parentIds.map((parentId) =>
        this._taskService.getByIdOnce$(parentId).pipe(first()).toPromise(),
      ),
    );

    // We need to make sure the uniqueness as both the parent as well as multiple child task can be scheduled
    const updateTagTasks = uniqueByProp<Task>([...parents, ...mainTasks], 'id');

    updateTagTasks.forEach((task) => {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds]);
    });
    tasksToDismiss.forEach((task: TaskWithReminderData) => {
      this.dismiss(task);
    });

    this._close();
  }

  async dismissAll(): Promise<void> {
    this.isDisableControls = true;
    const tasks = await this.tasks$.pipe(first()).toPromise();
    tasks.forEach((task) => {
      if (task.projectId || task.parentId || task.tagIds.length > 0) {
        this.dismiss(task);
      }
    });
    this._close();
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

  private _close(): void {
    this._matDialogRef.close();
  }

  private _removeFromList(reminderId: string): void {
    const newReminders = this.reminders$
      .getValue()
      .filter((reminder) => reminder.id !== reminderId);
    if (newReminders.length <= 0) {
      this._close();
    } else {
      this.reminders$.next(newReminders);
    }
  }
}
