import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Reminder } from '../../reminder/reminder.model';
import { Task, TaskWithReminderData } from '../task.model';
import { TaskService } from '../task.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { first, map, switchMap, takeWhile } from 'rxjs/operators';
import { T } from '../../../t.const';
import { DialogAddTaskReminderComponent } from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import { AddTaskReminderInterface } from '../dialog-add-task-reminder/add-task-reminder-interface';
import { TODAY_TAG } from '../../tag/tag.const';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { unique } from '../../../util/unique';
import { getTomorrow } from '../../../util/get-tomorrow';

const M = 1000 * 60;

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminders.component.html',
  styleUrls: ['./dialog-view-task-reminders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class DialogViewTaskRemindersComponent implements OnDestroy {
  // tslint:disable-next-line:typedef
  T = T;
  isDisableControls: boolean = false;
  reminders$: BehaviorSubject<Reminder[]> = new BehaviorSubject(this.data.reminders);
  tasks$: Observable<TaskWithReminderData[]> = this.reminders$.pipe(
    switchMap((reminders) => this._taskService.getByIdsLive$(reminders.map(r => r.relatedId)).pipe(
      first(),
      map((tasks: Task[]) => tasks
        .filter(task => !!task)
        .map((task): TaskWithReminderData => ({
          ...task,
          reminderData: reminders.find(r => r.relatedId === task.id) as Reminder
        }))
      )
    )),
  );
  isMultiple$: Observable<boolean> = this.tasks$.pipe(
    map(tasks => tasks.length > 1),
    takeWhile(isMultiple => !isMultiple, true)
  );
  isMultiple: boolean = false;

  private _subs: Subscription = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskRemindersComponent>,
    private _taskService: TaskService,
    private _matDialog: MatDialog,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminders: Reminder[] },
  ) {
    // this._matDialogRef.disableClose = true;
    this._subs.add(this._reminderService.onReloadModel$.subscribe(() => {
      this._close();
    }));
    this._subs.add(this._reminderService.onRemindersActive$.subscribe(reminders => {
      this.reminders$.next(reminders);
    }));
    this._subs.add(this.isMultiple$.subscribe(isMultiple => this.isMultiple = isMultiple));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  async addToToday(task: TaskWithReminderData) {
    // NOTE: we need to account for the parent task as well
    if (task.parentId) {
      const parent = await this._taskService.getByIdOnce$(task.parentId).pipe(first()).toPromise();
      this._taskService.updateTags(parent, [TODAY_TAG.id, ...parent.tagIds], parent.tagIds);
      this.dismiss(task);
    } else {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
      this.dismiss(task);
    }
  }

  dismiss(task: TaskWithReminderData) {
    this._taskService.update(task.id, {
      reminderId: null,
    });
    this._reminderService.removeReminder(task.reminderData.id);
    this._removeFromList(task.reminderId as string);
  }

  snooze(task: TaskWithReminderData, snoozeInMinutes: number) {
    this._reminderService.updateReminder(task.reminderData.id, {
      remindAt: Date.now() + (snoozeInMinutes * M)
    });
    this._removeFromList(task.reminderId as string);
  }

  snoozeUntilTomorrow(task: TaskWithReminderData) {
    this._reminderService.updateReminder(task.reminderData.id, {
      remindAt: getTomorrow().getTime()
    });
    this._removeFromList(task.reminderId as string);
  }

  editReminder(task: TaskWithReminderData, isCloseAfter: boolean = false) {
    this._subs.add(this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {task} as AddTaskReminderInterface
    }).afterClosed().subscribe(() => {
      this._removeFromList(task.reminderId as string);
      if (isCloseAfter) {
        this._close();
      }
    }));
  }

  trackById(i: number, task: Task) {
    return task.id;
  }

  // ALL ACTIONS
  // ------------
  snoozeAll(snoozeInMinutes: number) {
    this.isDisableControls = true;
    this.reminders$.getValue().forEach((reminder) => {
      this._reminderService.updateReminder(reminder.id, {
        remindAt: Date.now() + (snoozeInMinutes * M)
      });
    });
    this._close();
  }

  snoozeAllUntilTomorrow() {
    this.isDisableControls = true;
    const tomorrow = getTomorrow().getTime();
    this.reminders$.getValue().forEach((reminder) => {
      this._reminderService.updateReminder(reminder.id, {
        remindAt: tomorrow
      });
    });
    this._close();
  }

  async addAllToToday() {
    this.isDisableControls = true;
    const tasksToDismiss = await this.tasks$.pipe(first()).toPromise() as TaskWithReminderData[];
    const mainTasks = tasksToDismiss.filter(t => !t.parentId);
    const parentIds: string[] = unique<string>(
      tasksToDismiss
        .map(t => t.parentId as string)
        .filter(pid => !!pid)
    );
    const parents = await Promise.all(parentIds.map(parentId => this._taskService.getByIdOnce$(parentId).pipe(first()).toPromise()));
    const updateTagTasks = [...parents, ...mainTasks];

    updateTagTasks.forEach(task => {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
    });
    tasksToDismiss.forEach((task: TaskWithReminderData) => {
      this.dismiss(task);
    });

    this._close();
  }

  async dismissAll() {
    this.isDisableControls = true;
    const tasks = await this.tasks$.pipe(first()).toPromise();
    tasks.forEach((task) => {
      this.dismiss(task);
    });
    this._close();
  }

  async play() {
    const tasks = await this.tasks$.pipe(first()).toPromise();
    if (tasks.length !== 1) {
      throw new Error('More or less than one task');
    }
    this.isDisableControls = true;

    const task = tasks[0];
    if (task.parentId) {
      this._taskService.moveToToday(task.parentId, true);
    } else {
      this._taskService.moveToToday(task.id, true);
    }
    this._taskService.setCurrentId(task.id);
    this.dismiss(task);
  }

  private _close() {
    this._matDialogRef.close();
  }

  private _removeFromList(reminderId: string) {
    const newReminders = this.reminders$.getValue().filter(reminder => reminder.id !== reminderId);
    if (newReminders.length <= 0) {
      this._close();
    } else {
      this.reminders$.next(newReminders);
    }
  }
}
