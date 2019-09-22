import {ChangeDetectionStrategy, Component} from '@angular/core';
import {T} from '../../t.const';
import {TaskService} from '../../features/tasks/task.service';
import {ScheduledTaskService} from '../../features/tasks/scheduled-task.service';
import {ReminderService} from '../../features/reminder/reminder.service';
import {MatDialog} from '@angular/material';
import {TaskWithReminderData} from '../../features/tasks/task.model';
import {DialogAddTaskReminderComponent} from '../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import {standardListAnimation} from '../../ui/animations/standard-list.ani';
import {Router} from '@angular/router';
import {take} from 'rxjs/operators';
import {ProjectService} from '../../features/project/project.service';
import {THEME_COLOR_MAP} from '../../app.constants';

@Component({
  selector: 'schedule-page',
  templateUrl: './schedule-page.component.html',
  styleUrls: ['./schedule-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class SchedulePageComponent {
  T = T;

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public scheduledTaskService: ScheduledTaskService,
    private _reminderService: ReminderService,
    private _matDialog: MatDialog,
    private _router: Router,
  ) {
  }

  trackByFn(i: number, task: TaskWithReminderData) {
    return task.id;
  }

  startTask(task: TaskWithReminderData) {
    if (task.parentId) {
      this.taskService.moveToToday(task.parentId, true);
    } else {
      this.taskService.moveToToday(task.id, true);
    }
    this.taskService.removeReminder(task.id, task.reminderId);
    this.taskService.setCurrentId(task.id);
    this._router.navigate(['/work-view']);
  }

  startTaskFromOtherProject(task: TaskWithReminderData) {
    this.taskService.startTaskFromOtherProject$(task.id, task.reminderData.projectId).pipe(take(1)).subscribe(() => {
      this._router.navigate(['/work-view']);
    });
  }

  removeReminder(task: TaskWithReminderData) {
    this.taskService.removeReminder(task.id, task.reminderId);
  }

  editReminder(task: TaskWithReminderData) {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        task,
      }
    });
  }

  getThemeColor(color: string): { [key: string]: string } {
    const standardColor = THEME_COLOR_MAP[color];
    const colorToUse = (standardColor)
      ? standardColor
      : color;
    return {background: colorToUse};
  }
}
