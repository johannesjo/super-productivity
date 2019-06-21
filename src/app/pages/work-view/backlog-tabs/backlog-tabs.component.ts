import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TaskService} from '../../../features/tasks/task.service';
import {ReminderService} from '../../../features/reminder/reminder.service';
import {DialogAddTaskReminderComponent} from '../../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import {MatDialog} from '@angular/material/dialog';
import {TaskWithReminderData} from '../../../features/tasks/task.model';
import {standardListAnimation} from '../../../ui/animations/standard-list.ani';
import {combineLatest, forkJoin, from, Observable} from 'rxjs';
import {map, shareReplay, switchMap} from 'rxjs/operators';
import {ProjectService} from '../../../features/project/project.service';
import {ScheduledTaskService} from '../../../features/tasks/scheduled-task.service';

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class BacklogTabsComponent {
  // TODO switch back to 0
  selectedIndex = 1;

  constructor(
    public taskService: TaskService,
    public scheduledTaskService: ScheduledTaskService,
    private _reminderService: ReminderService,
    private _matDialog: MatDialog,
  ) {
  }

  indexChange(index) {
    this.selectedIndex = index;
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
  }

  removeReminder(task: TaskWithReminderData) {
    this.taskService.removeReminder(task.id, task.reminderId);
  }

  editReminder(task: TaskWithReminderData) {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {
        task: task,
      }
    });
  }
}
