import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { ProjectService } from '../../../features/project/project.service';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { mapArchiveToWorklog, Worklog, WorklogDay, WorklogMonth } from '../../../util/map-archive-to-worklog';
import { DialogSimpleTaskExportComponent } from '../../../features/simple-task-export/dialog-simple-task-export/dialog-simple-task-export.component';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';
import { Task, TaskCopy } from '../../../features/tasks/task.model';
import { TaskService } from '../../../features/tasks/task.service';
import { Router } from '@angular/router';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { EntityState } from '@ngrx/entity';
import { dedupeByKey } from '../../../util/de-dupe-by-key';
import { WeeksInMonth } from '../../../util/get-weeks-in-month';

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

  exportData(
    type,
    monthData: WorklogMonth,
    year: number,
    month_: string | number,
    week?: WeeksInMonth
  ) {
    const month = +month_ - 1;
    if (type === 'MONTH') {
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      lastDayOfMonth.setHours(23);
      lastDayOfMonth.setMinutes(59);
      lastDayOfMonth.setSeconds(59);

      this._matDialog.open(DialogSimpleTaskExportComponent, {
        restoreFocus: true,
        panelClass: 'big',
        data: {
          tasks: this._createTasksForMonth(monthData),
          isWorklogExport: true,
          dateStart: firstDayOfMonth,
          dateEnd: lastDayOfMonth,
        }
      });
    }
    if (type === 'WEEK') {
      const startOfWeek = new Date(year, month, week.start);
      const endOfWeek = new Date(year, month, week.end);
      endOfWeek.setHours(23);
      endOfWeek.setMinutes(59);
      endOfWeek.setSeconds(59);
      this._matDialog.open(DialogSimpleTaskExportComponent, {
        restoreFocus: true,
        panelClass: 'big',
        data: {
          tasks: this._createTasksForMonth(monthData),
          isWorklogExport: true,
          dateStart: startOfWeek,
          dateEnd: endOfWeek,
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
    console.log(this.worklog);
  }

  private _createTasksForDay(data: WorklogDay) {
    const tasks = [];
    const dayData = {...data};

    dayData.logEntries.forEach((entry) => {
      const task: any = {...entry.task};
      if (!task.parentId) {
        task.timeSpent = entry.timeSpent;
        task.dateStr = dayData.dateStr;
        tasks.push(task);
      }
    });

    return dedupeByKey(tasks, 'id');
  }

  private _createTasksForMonth(data: WorklogMonth) {
    let tasks = [];
    const monthData = {...data};
    Object.keys(monthData.ent).forEach(dayDateStr => {
      const entry: WorklogDay = monthData.ent[dayDateStr];
      tasks = tasks.concat(this._createTasksForDay(entry));
    });
    return dedupeByKey(tasks, 'id');
  }
}
