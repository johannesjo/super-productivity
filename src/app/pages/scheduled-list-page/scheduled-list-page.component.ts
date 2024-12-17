import { ChangeDetectionStrategy, Component, Inject, LOCALE_ID } from '@angular/core';
import { T } from '../../t.const';
import { ScheduledTaskService } from '../../features/tasks/scheduled-task.service';
import { MatDialog } from '@angular/material/dialog';
import { TaskCopy, TaskWithReminderData } from '../../features/tasks/task.model';
import { standardListAnimation } from '../../ui/animations/standard-list.ani';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Tag } from '../../features/tag/tag.model';
import { Store } from '@ngrx/store';
import { selectTaskRepeatCfgsSortedByTitleAndProject } from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { getTaskRepeatInfoText } from '../../features/tasks/task-detail-panel/get-task-repeat-info-text.util';
import { TaskRepeatCfg } from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import { TranslateService } from '@ngx-translate/core';
import { DialogEditTaskRepeatCfgComponent } from '../../features/task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { TaskRepeatCfgService } from '../../features/task-repeat-cfg/task-repeat-cfg.service';
import { DialogScheduleTaskComponent } from '../../features/planner/dialog-schedule-task/dialog-schedule-task.component';
import { selectAllTasksWithPlannedDay } from '../../features/planner/store/planner.selectors';

@Component({
  selector: 'scheduled-list-page',
  templateUrl: './scheduled-list-page.component.html',
  styleUrls: ['./scheduled-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation],
  standalone: false,
})
export class ScheduledListPageComponent {
  T: typeof T = T;
  TODAY_TAG: Tag = TODAY_TAG;
  taskRepeatCfgs$ = this._store.select(selectTaskRepeatCfgsSortedByTitleAndProject);
  tasksPlannedForDays$ = this._store.select(selectAllTasksWithPlannedDay);

  constructor(
    public scheduledTaskService: ScheduledTaskService,
    private _matDialog: MatDialog,
    private _store: Store,
    private _translateService: TranslateService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  editReminder(task: TaskCopy, ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this._matDialog.open(DialogScheduleTaskComponent, {
      restoreFocus: true,
      data: { task },
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
}
