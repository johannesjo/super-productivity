import {ChangeDetectionStrategy, Component} from '@angular/core';
import {T} from '../../t.const';
import {TaskService} from '../../features/tasks/task.service';
import {ScheduledTaskService} from '../../features/tasks/scheduled-task.service';
import {ReminderService} from '../../features/reminder/reminder.service';
import {MatDialog} from '@angular/material/dialog';
import {Task, TaskWithReminderData} from '../../features/tasks/task.model';
import {DialogAddTaskReminderComponent} from '../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import {standardListAnimation} from '../../ui/animations/standard-list.ani';
import {Router} from '@angular/router';
import {take} from 'rxjs/operators';
import {ProjectService} from '../../features/project/project.service';
import {THEME_COLOR_MAP} from '../../app.constants';
import {AddTaskReminderInterface} from '../../features/tasks/dialog-add-task-reminder/add-task-reminder-interface';

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
    public reminderService: ReminderService,
    private _matDialog: MatDialog,
    private _router: Router,
  ) {
  }

  startTask(task: TaskWithReminderData) {
    if (task.reminderData.projectId === this.projectService.currentId) {
      this._startTaskFronCurrentProject(task);
    } else {
      this._startTaskFromOtherProject(task);
    }
  }

  removeReminder(task: TaskWithReminderData) {
    this.taskService.removeReminder(task.id, task.reminderId);
  }

  editReminder(task: TaskWithReminderData) {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        reminderId: task.reminderId,
        taskId: task.id,
        title: task.title,
      } as AddTaskReminderInterface
    });
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string, task: Task) {
    if (isChanged) {
      this.taskService.updateForProject(task.id, task.projectId, {title: newTitle});
    }
    // this.focusSelf();
  }


  trackByFn(i: number, task: TaskWithReminderData) {
    return task.id;
  }

  getThemeColor(color: string): { [key: string]: string } {
    const standardColor = THEME_COLOR_MAP[color];
    const colorToUse = (standardColor)
      ? standardColor
      : color;
    return {background: colorToUse};
  }

  private _startTaskFronCurrentProject(task: TaskWithReminderData) {
    if (task.parentId) {
      this.taskService.moveToToday(task.parentId, true);
    } else {
      this.taskService.moveToToday(task.id, true);
    }
    this.taskService.removeReminder(task.id, task.reminderId);
    this.taskService.setCurrentId(task.id);
    this._router.navigate(['/active/tasks']);
  }

  private _startTaskFromOtherProject(task: TaskWithReminderData) {
    this.taskService.startTaskFromOtherProject$(task.id, task.reminderData.projectId).pipe(take(1)).subscribe(() => {
      this._router.navigate(['/active/tasks']);
    });
  }
}
