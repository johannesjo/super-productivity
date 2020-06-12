import {ChangeDetectionStrategy, Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Reminder} from '../../reminder/reminder.model';
import {Task} from '../task.model';
import {TaskService} from '../task.service';
import {Observable, Subscription} from 'rxjs';
import {ReminderService} from '../../reminder/reminder.service';
import {take} from 'rxjs/operators';
import {ProjectService} from '../../project/project.service';
import {Router} from '@angular/router';
import {T} from '../../../t.const';
import {DialogAddTaskReminderComponent} from '../dialog-add-task-reminder/dialog-add-task-reminder.component';
import {AddTaskReminderInterface} from '../dialog-add-task-reminder/add-task-reminder-interface';
import {WorkContextService} from '../../work-context/work-context.service';
import {TagService} from '../../tag/tag.service';
import {Tag} from '../../tag/tag.model';
import {Project} from '../../project/project.model';
import {WorkContextType} from '../../work-context/work-context.model';
import {truncate} from '../../../util/truncate';
import {TODAY_TAG} from '../../tag/tag.const';

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminder.component.html',
  styleUrls: ['./dialog-view-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewTaskReminderComponent implements OnDestroy {
  T = T;
  task: Task;
  taskTitle: string;
  reminder: Reminder = this.data.reminder;
  isForCurrentContext = (this.reminder.workContextId === this._workContextService.activeWorkContextId);
  isForTag = this.reminder.workContextType === WorkContextType.TAG;
  isForProject = this.reminder.workContextType === WorkContextType.PROJECT;
  isShowAddToToday = false;

  targetContext$: Observable<Tag | Project> = (this.data.reminder.workContextType === WorkContextType.PROJECT)
    ? this._projectService.getByIdOnce$(this.reminder.workContextId)
    : this._tagService.getTagById$(this.reminder.workContextId);

  isDisableControls = false;

  private _task$: Observable<Task> = this._taskService.getByIdOnce$(this.data.reminder.relatedId);
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskReminderComponent>,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _router: Router,
    private _matDialog: MatDialog,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._subs.add(this._task$.pipe(take(1)).subscribe(task => {
      this.task = task;
      this.isShowAddToToday = !(this.task.tagIds.includes(TODAY_TAG.id));
      this.taskTitle = truncate(task.title);
    }));
    this._subs.add(this._reminderService.onReloadModel$.subscribe(() => {
      this._close();
    }));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  addToToday() {
    // NOTE: we need to account for the parent task as well
    if (this.task.parentId) {
      this._subs.add(this._taskService.getByIdOnce$(this.task.parentId).subscribe(parentTask => {
        this._taskService.updateTags(parentTask, [TODAY_TAG.id, ...parentTask.tagIds], parentTask.tagIds);
        this.dismiss();
      }));
    } else {
      this._taskService.updateTags(this.task, [TODAY_TAG.id, ...this.task.tagIds], this.task.tagIds);
      this.dismiss();
    }
  }

  play() {
    this.isDisableControls = true;
    if (this.isForCurrentContext) {
      this._startTask();
      this.dismiss();
    } else {
      this._router.navigate(['/active/tasks']);
      // TODO probably better handled as effect
      this._subs.add(this._taskService.startTaskFromOtherContext$(
        this.reminder.relatedId,
        this.reminder.workContextType,
        this.reminder.workContextId
      ).subscribe(() => {
        this.dismiss();
      }));
    }
  }

  dismiss() {
    this.isDisableControls = true;
    this._taskService.update(this.reminder.relatedId, {
      reminderId: null,
    });
    this._reminderService.removeReminder(this.reminder.id);
    this._close();
  }

  snooze(snoozeInMinutes) {
    this.isDisableControls = true;
    this._reminderService.updateReminder(this.reminder.id, {
      remindAt: Date.now() + (snoozeInMinutes * 60 * 1000)
    });
    this._close();
  }

  editReminder() {
    this.isDisableControls = true;
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        title: this.task ? this.task.title : this.reminder.title,
        taskId: this.reminder.relatedId,
        reminderId: this.reminder.id,
        isMoveToBacklogPossible: false,
      } as AddTaskReminderInterface
    });
    this._close();
  }

  private _close() {
    this._matDialogRef.close();
  }

  private _startTask() {
    if (this.task.parentId) {
      this._taskService.moveToToday(this.task.parentId, true);
    } else {
      this._taskService.moveToToday(this.reminder.relatedId, true);
    }
    this._taskService.setCurrentId(this.reminder.relatedId);
  }
}
