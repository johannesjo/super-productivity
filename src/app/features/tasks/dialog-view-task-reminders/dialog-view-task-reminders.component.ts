import {ChangeDetectionStrategy, Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Reminder} from '../../reminder/reminder.model';
import {Task, TaskWithReminderData} from '../task.model';
import {TaskService} from '../task.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {ReminderService} from '../../reminder/reminder.service';
import {first, map, switchMap} from 'rxjs/operators';
import {ProjectService} from '../../project/project.service';
import {Router} from '@angular/router';
import {T} from '../../../t.const';
import {DialogAddTaskReminderComponent} from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import {AddTaskReminderInterface} from '../dialog-add-task-reminder/add-task-reminder-interface';
import {WorkContextService} from '../../work-context/work-context.service';
import {TagService} from '../../tag/tag.service';
import {TODAY_TAG} from '../../tag/tag.const';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {DataInitService} from '../../../core/data-init/data-init.service';
import {unique} from '../../../util/unique';

const M = 100 * 60;

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminders.component.html',
  styleUrls: ['./dialog-view-task-reminders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class DialogViewTaskRemindersComponent implements OnDestroy {
  T = T;
  isDisableControls = false;
  reminders$ = new BehaviorSubject<Reminder[]>(this.data.reminders);
  tasks$: Observable<TaskWithReminderData[]> = this.reminders$.pipe(
    switchMap((reminders) => this._taskService.getByIdsLive$(reminders.map(r => r.relatedId)).pipe(
      first(),
      map((tasks: Task[]) => tasks
        .filter(task => !!task)
        .map((task) => ({
          ...task,
          reminderData: reminders.find(r => r.relatedId === task.id)
        }))
      )
    )),
  );
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskRemindersComponent>,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _router: Router,
    private _matDialog: MatDialog,
    private _dataInitService: DataInitService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminders: Reminder[] },
  ) {
    // this._matDialogRef.disableClose = true;
    this._subs.add(this._reminderService.onReloadModel$.subscribe(() => {
      this._close();
    }));
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
    this._removeFromList(task.reminderId);
  }

  snooze(task: TaskWithReminderData, snoozeInMinutes: number) {
    this._reminderService.updateReminder(task.reminderData.id, {
      remindAt: Date.now() + (snoozeInMinutes * M)
    });
    this._removeFromList(task.reminderId);
  }

  editReminder(task: TaskWithReminderData) {
    this._subs.add(this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        title: task.title,
        taskId: task.id,
        reminderId: task.reminderData.id,
        isMoveToBacklogPossible: false,
      } as AddTaskReminderInterface
    }).afterClosed().subscribe(() => {
      this._removeFromList(task.reminderId);
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

  async addAllToToday() {
    this.isDisableControls = true;
    const tasksToDismiss = await this.tasks$.pipe(first()).toPromise();
    const mainTasks = tasksToDismiss.filter(t => !t.parentId);
    const parentIds: string[] = unique(tasksToDismiss.map(t => t.parentId).filter(pid => pid));
    const parents = await Promise.all(parentIds.map(parentId => this._taskService.getByIdOnce$(parentId).pipe(first()).toPromise()));
    const updateTagTasks = [...parents, ...mainTasks];

    updateTagTasks.forEach(task => {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
    });
    tasksToDismiss.forEach((task) => {
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
