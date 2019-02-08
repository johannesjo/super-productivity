import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TaskService } from '../../../features/tasks/task.service';
import { ReminderService } from '../../../features/reminder/reminder.service';
import { DialogAddTaskReminderComponent } from '../../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { MatDialog } from '@angular/material';
import { TaskWithReminderData } from '../../../features/tasks/task.model';

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogTabsComponent implements OnInit {
  selectedIndex = 1;

  constructor(
    public taskService: TaskService,
    private _reminderService: ReminderService,
    private _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  indexChange(index) {

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
