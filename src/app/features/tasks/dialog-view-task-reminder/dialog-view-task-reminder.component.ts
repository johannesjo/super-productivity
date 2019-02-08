import { ChangeDetectionStrategy, Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { Reminder } from '../../reminder/reminder.model';
import { Task } from '../task.model';
import { TaskService } from '../task.service';
import { Observable, Subscription } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { delay, switchMap, take } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { Project } from '../../project/project.model';

@Component({
  selector: 'dialog-view-task-reminder',
  templateUrl: './dialog-view-task-reminder.component.html',
  styleUrls: ['./dialog-view-task-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogViewTaskReminderComponent implements OnDestroy {
  task$: Observable<Task> = this._taskService.getById(this.data.reminder.relatedId);
  task: Task;
  reminder: Reminder = this.data.reminder;
  isForCurrentProject = (this.reminder.projectId === this._projectService.currentId);
  targetProject$: Observable<Project> = this._projectService.getById(this.reminder.projectId);
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogViewTaskReminderComponent>,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _reminderService: ReminderService,
    @Inject(MAT_DIALOG_DATA) public data: { reminder: Reminder },
  ) {
    this._matDialogRef.disableClose = true;
    this._subs.add(this.task$.pipe(take(1)).subscribe(task => this.task = task));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  play() {
    if (this.isForCurrentProject) {
      this._startTask();
      this.dismiss();
    } else {
      this._subs.add(
        this._projectService.onProjectChange$.pipe(
          // TODO less hacky way of waiting for data
          delay(250),
          switchMap(() => this.task$.pipe(take(1)))
        ).subscribe(task => {
          this.task = task;
          this.isForCurrentProject = true;
          this._startTask();
          this.dismiss();
        }));
      this._projectService.setCurrentId(this.reminder.projectId);
    }
  }

  dismiss() {
    if (this.task) {
      this._taskService.update(this.reminder.relatedId, {
        reminderId: null,
      });
    }
    this._reminderService.removeReminder(this.reminder.id);
    this.close();
  }

  snooze() {
    this._reminderService.updateReminder(this.reminder.id, {
      remindAt: Date.now() + (10 * 60 * 1000)
    });
    this.close();
  }

  close() {
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
