import { ChangeDetectionStrategy, Component } from '@angular/core';
import { T } from '../../t.const';
import { TaskService } from '../../features/tasks/task.service';
import { ScheduledTaskService } from '../../features/tasks/scheduled-task.service';
import { ReminderService } from '../../features/reminder/reminder.service';
import { MatDialog } from '@angular/material/dialog';
import { Task, TaskWithReminderData } from '../../features/tasks/task.model';
import { DialogAddTaskReminderComponent } from '../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { AddTaskReminderInterface } from '../../features/tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Tag } from '../../features/tag/tag.model';

@Component({
  selector: 'schedule-page',
  templateUrl: './schedule-page.component.html',
  styleUrls: ['./schedule-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation]
})
export class SchedulePageComponent {
  T: typeof T = T;
  TODAY_TAG: Tag = TODAY_TAG;

  constructor(
    public scheduledTaskService: ScheduledTaskService,
    public reminderService: ReminderService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _matDialog: MatDialog,
    private _router: Router,
  ) {
  }

  startTask(task: TaskWithReminderData) {
    if (task.reminderData.workContextId === this._workContextService.activeWorkContextId) {
      this._startTaskFronCurrentProject(task);
    } else {
      this._startTaskFromOtherProject(task);
    }
  }

  toggleToday(task: TaskWithReminderData | Task) {
    if (task.tagIds.includes(TODAY_TAG.id)) {
      this._taskService.updateTags(task, task.tagIds.filter(id => id !== TODAY_TAG.id), task.tagIds);
    } else {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);

    }
  }

  removeReminder(task: TaskWithReminderData) {
    if (task.reminderId) {
      this._taskService.unScheduleTask(task.id, task.reminderId);
    }

  }

  editReminder(task: TaskWithReminderData) {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: {task} as AddTaskReminderInterface
    });
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string, task: Task) {
    if (isChanged) {
      this._taskService.update(task.id, {title: newTitle});
    }
    // this.focusSelf();
  }

  trackByFn(i: number, task: TaskWithReminderData) {
    return task.id;
  }

  private _startTaskFronCurrentProject(task: TaskWithReminderData) {
    if (!!task.parentId) {
      this._taskService.moveToToday(task.parentId, true);
    } else {
      this._taskService.moveToToday(task.id, true);
    }
    if (!!task.reminderId) {
      this._taskService.unScheduleTask(task.id, task.reminderId);
    }
    this._taskService.setCurrentId(task.id);
    this._router.navigate(['/active/tasks']);
  }

  private _startTaskFromOtherProject(task: TaskWithReminderData) {
    this._taskService.startTaskFromOtherContext$(task.id, task.reminderData.workContextType, task.reminderData.workContextId)
      .pipe(take(1))
      .subscribe(() => {
        this._router.navigate(['/active/tasks']);
      });
  }
}
