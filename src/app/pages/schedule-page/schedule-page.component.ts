import { ChangeDetectionStrategy, Component, Inject, LOCALE_ID } from '@angular/core';
import { T } from '../../t.const';
import { TaskService } from '../../features/tasks/task.service';
import { ScheduledTaskService } from '../../features/tasks/scheduled-task.service';
import { ReminderService } from '../../features/reminder/reminder.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Task, TaskWithReminderData } from '../../features/tasks/task.model';
import { DialogAddTaskReminderComponent } from '../../features/tasks/dialog-add-task-reminder/dialog-add-task-reminder.component';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { Router } from '@angular/router';
import { AddTaskReminderInterface } from '../../features/tasks/dialog-add-task-reminder/add-task-reminder-interface';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Tag } from '../../features/tag/tag.model';
import { ProjectService } from '../../features/project/project.service';
import { Store } from '@ngrx/store';
import { selectTaskRepeatCfgsSortedByTitleAndProject } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { getTaskRepeatInfoText } from '../../features/tasks/task-additional-info/get-task-repeat-info-text.util';
import { TaskRepeatCfg } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TranslateService } from '@ngx-translate/core';
import { DialogEditTaskRepeatCfgComponent } from '../../features/task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { TaskRepeatCfgService } from '../../features/task-repeat-cfg/task-repeat-cfg.service';

@Component({
  selector: 'schedule-page',
  templateUrl: './schedule-page.component.html',
  styleUrls: ['./schedule-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
})
export class SchedulePageComponent {
  T: typeof T = T;
  TODAY_TAG: Tag = TODAY_TAG;
  taskRepeatCfgs$ = this._store.select(selectTaskRepeatCfgsSortedByTitleAndProject);

  constructor(
    public scheduledTaskService: ScheduledTaskService,
    public reminderService: ReminderService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _matDialog: MatDialog,
    private _router: Router,
    private _store: Store,
    private _translateService: TranslateService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  startTask(task: TaskWithReminderData): void {
    this._startTask(task);
  }

  toggleToday(task: TaskWithReminderData | Task): void {
    if (task.tagIds.includes(TODAY_TAG.id)) {
      this._taskService.updateTags(
        task,
        task.tagIds.filter((id) => id !== TODAY_TAG.id),
        task.tagIds,
      );
    } else {
      this._taskService.updateTags(task, [TODAY_TAG.id, ...task.tagIds], task.tagIds);
    }
  }

  removeReminder(task: TaskWithReminderData): void {
    if (task.reminderId) {
      this._taskService.unScheduleTask(task.id, task.reminderId);
    }
  }

  editReminder(task: TaskWithReminderData): void {
    this._matDialog.open(DialogAddTaskReminderComponent, {
      restoreFocus: true,
      data: { task } as AddTaskReminderInterface,
    });
  }

  editTaskRepeatCfg(repeatCfg: TaskRepeatCfg): void {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: false,
      data: {
        repeatCfg,
      },
    });
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string, task: Task): void {
    if (isChanged && newTitle !== task.title) {
      this._taskService.update(task.id, { title: newTitle });
    }
  }

  updateRepeatableTitleIfChanged(
    isChanged: boolean,
    newTitle: string,
    repeatCfg: TaskRepeatCfg,
  ): void {
    if (isChanged && newTitle !== repeatCfg.title) {
      this._taskRepeatCfgService.updateTaskRepeatCfg(
        repeatCfg.id,
        {
          title: newTitle,
        },
        true,
      );
    }
  }

  trackByFn(i: number, task: TaskWithReminderData): string {
    return task.id;
  }

  getRepeatInfoText(repeatCfg: TaskRepeatCfg): string {
    const [key, params] = getTaskRepeatInfoText(repeatCfg, this.locale);
    return this._translateService.instant(key, params);
  }

  private _startTask(task: TaskWithReminderData): void {
    // NOTE: reminder needs to be deleted first to avoid problems with "Missing reminder" devError
    if (!!task.reminderId) {
      this._taskService.unScheduleTask(task.id, task.reminderId);
    }
    if (task.projectId) {
      if (!!task.parentId) {
        this._projectService.moveTaskToTodayList(task.parentId, task.projectId, true);
      } else {
        this._projectService.moveTaskToTodayList(task.id, task.projectId, true);
      }
    }
    this._taskService.setCurrentId(task.id);
    this._router.navigate(['/active/tasks']);
  }
}
