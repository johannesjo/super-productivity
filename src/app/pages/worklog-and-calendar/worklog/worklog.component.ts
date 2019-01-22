import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { ProjectService } from '../../../features/project/project.service';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { mapArchiveToWorklog, Worklog, WorklogDay, WorklogMonth } from '../../../util/map-archive-to-worklog';
import { DialogSimpleTaskSummaryComponent } from '../../../features/simple-task-summary/dialog-simple-task-summary/dialog-simple-task-summary.component';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';
import { Task, TaskCopy } from '../../../features/tasks/task.model';
import { TaskService } from '../../../features/tasks/task.service';
import { Router } from '@angular/router';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { EntityState } from '@ngrx/entity';

const EMPTY_ENTITY = {
  ids: [],
  entities: {},
};


@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation]
})
export class WorklogComponent implements OnInit, OnDestroy {
  worklog: Worklog = {};
  totalTimeSpent: number;
  private _projectId: string;
  private _isUnloaded = false;
  private _subs = new Subscription();

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _projectService: ProjectService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _cd: ChangeDetectorRef,
    private readonly _router: Router,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.currentId$.subscribe((id) => {
      this._projectId = id;
      this._loadData(id);
    }));
  }

  ngOnDestroy(): void {
    // TODO better solution
    this._isUnloaded = true;
    this._subs.unsubscribe();
  }

  exportData(type, monthData: WorklogMonth) {
    if (type === 'MONTH') {
      this._matDialog.open(DialogSimpleTaskSummaryComponent, {
        restoreFocus: true,
        data: {
          tasks: this._createTasksForMonth(monthData),
          isWorklogExport: true,
        }
      });
    }
  }

  restoreTask(yearKey, monthKey, dayKey, task: TaskCopy) {
    console.log(yearKey, monthKey, dayKey, task);


    this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        okTxt: 'Do it!',
        message: `Are you sure you want to move the task <strong>"${task.title}"</strong> into your todays task list?`,
      }
    }).afterClosed()
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          const worklogDay: WorklogDay = this.worklog[yearKey].ent[monthKey].ent[dayKey];
          const index = worklogDay.logEntries.findIndex(ent => ent.task === task);

          if (index > -1) {
            // TODO refactor to task action!!!
            worklogDay.logEntries.splice(index, 1);
            this.worklog = {...this.worklog};
            this._taskService.restoreTask(task);
            this._router.navigate(['/work-view']);
          }
        }
      });
  }

  sortWorklogItems(a, b) {
    return b.key - a.key;
  }

  private async _loadData(projectId): Promise<any> {
    const archive = await this._persistenceService.loadTaskArchiveForProject(projectId) || EMPTY_ENTITY;
    const taskState = await this._persistenceService.loadTasksForProject(projectId) || EMPTY_ENTITY;

    const completeState: EntityState<Task> = {
      ids: [...archive.ids, ...taskState.ids] as string[],
      entities: {
        ...archive.entities,
        ...taskState.entities
      }
    };

    if (this._isUnloaded) {
      return;
    }

    if (completeState) {
      const {worklog, totalTimeSpent} = mapArchiveToWorklog(completeState, taskState.ids);
      this.worklog = worklog;
      this.totalTimeSpent = totalTimeSpent;
      this._cd.detectChanges();
    } else {
      this.worklog = {};
      this.totalTimeSpent = null;
      this._cd.detectChanges();
    }
  }

  private _createTasksForDay(data: WorklogDay) {
    const tasks = [];
    const dayData = {...data};

    dayData.logEntries.forEach((entry) => {
      const task: any = {...entry.task};
      task.timeSpent = entry.timeSpent;
      task.dateStr = dayData.dateStr;
      tasks.push(task);
    });

    return tasks;
  }

  private _createTasksForMonth(data: WorklogMonth) {
    let tasks = [];
    const monthData = {...data};
    Object.keys(monthData.ent).forEach(dayDateStr => {
      const entry: WorklogDay = monthData.ent[dayDateStr];
      tasks = tasks.concat(this._createTasksForDay(entry));
    });
    return tasks;
  }
}
