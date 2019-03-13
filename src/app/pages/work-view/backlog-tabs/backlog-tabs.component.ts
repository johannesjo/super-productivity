import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TaskService } from '../../../features/tasks/task.service';
import { ReminderService } from '../../../features/reminder/reminder.service';
import { DialogAddTaskReminderComponent } from '../../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { MatDialog } from '@angular/material';
import { TaskWithReminderData } from '../../../features/tasks/task.model';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  selector: 'backlog-tabs',
  templateUrl: './backlog-tabs.component.html',
  styleUrls: ['./backlog-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class BacklogTabsComponent {
  selectedIndex = 0;
  scheduledTasks$: Observable<TaskWithReminderData[]> = combineLatest(
    this.taskService.scheduledTasksWOData$,
    this._reminderService.reminders$,
  ).pipe(
    map(([tasks, reminders]) => tasks
      .map((task) => {
        return {
          ...task,
          reminderData: this._reminderService.getById(task.reminderId),
        };
      })
      // models might not be in sync just yet :/
      .filter(task => task.reminderData)
      .sort((a, b) => a.reminderData.remindAt - b.reminderData.remindAt)
    ),
    distinctUntilChanged(),
  );

  constructor(
    public taskService: TaskService,
    private _reminderService: ReminderService,
    private _matDialog: MatDialog,
  ) {
    // this.taskService.scheduledTasks$.subscribe((val) => console.log('taskService.scheduledTasks$', val));
  }

  indexChange(index) {
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
