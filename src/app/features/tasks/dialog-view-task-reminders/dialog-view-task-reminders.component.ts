import {ChangeDetectionStrategy, Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Reminder} from '../../reminder/reminder.model';
import {Task, TaskWithReminderData} from '../task.model';
import {TaskService} from '../task.service';
import {Observable, Subscription} from 'rxjs';
import {ReminderService} from '../../reminder/reminder.service';
import {map, take, tap} from 'rxjs/operators';
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

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminders.component.html',
  styleUrls: ['./dialog-view-task-reminders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class DialogViewTaskRemindersComponent implements OnDestroy {
  T = T;
  reminders: Reminder[] = this.data.reminders;
  taskIds: string[] = this.reminders.map(r => r.relatedId);

  isDisableControls = false;
  tasks$: Observable<TaskWithReminderData[]> = this._taskService.getByIdsLive$(this.taskIds).pipe(
    tap((b) => console.log(b)),
    take(2),
    map((tasks: Task[]) => tasks
      .filter(task => !!task)
      .map((task) => ({
        ...task,
        reminderData: this.reminders.find(r => r.relatedId === task.id)
      })))
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
    this.tasks$.subscribe((v) => console.log('tasks$', v));

  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  addToToday(task: TaskWithReminderData) {
    // NOTE: we need to account for the parent task as well
    if (task.parentId) {
      this._subs.add(this._taskService.getByIdOnce$(task.parentId).subscribe(parentTask => {
        this._taskService.updateTags(parentTask, [TODAY_TAG.id, ...parentTask.tagIds], parentTask.tagIds);
        this.dismiss(task);
      }));
    } else {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
      this.dismiss(task);
    }
  }

  dismiss(task: TaskWithReminderData) {
    this.isDisableControls = true;
    this._taskService.update(task.id, {
      reminderId: null,
    });
    this._reminderService.removeReminder(task.reminderData.id);
  }

  snooze(task: TaskWithReminderData, snoozeInMinutes: number) {
    this.isDisableControls = true;
    this._reminderService.updateReminder(task.reminderData.id, {
      remindAt: Date.now() + (snoozeInMinutes * 60 * 1000)
    });
  }

  editReminder(task: TaskWithReminderData) {
    this.isDisableControls = true;
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        title: task.title,
        taskId: task.id,
        reminderId: task.reminderData.id,
        isMoveToBacklogPossible: false,
      } as AddTaskReminderInterface
    });
  }

  trackById(i: number, task: Task) {
    return task.id;
  }

  // ALL ACTIONS
  // ------------
  snoozeAll(snoozeInMinutes: number) {
  }

  addAllToToday() {
  }

  dismissAll() {

  }

  private _close() {
    this._matDialogRef.close();
  }

}
