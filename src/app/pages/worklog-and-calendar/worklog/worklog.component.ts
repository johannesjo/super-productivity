import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { ProjectService } from '../../../project/project.service';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { mapArchiveToWorklog, WorklogDay, WorklogMonth } from '../../../core/util/map-archive-to-worklog';
import { DialogSimpleTaskSummaryComponent } from '../../../core/dialog-simple-task-summary/dialog-simple-task-summary.component';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';


@Component({
  selector: 'worklog',
  templateUrl: './worklog.component.html',
  styleUrls: ['./worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation]
})
export class WorklogComponent implements OnInit, OnDestroy {
  worklog: any = {};
  totalTimeSpent: number;
  private _isUnloaded = false;
  private _subs = new Subscription();

  constructor(
    private readonly _persistenceService: PersistenceService,
    private readonly _projectService: ProjectService,
    private readonly _matDialog: MatDialog,
    private readonly _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._projectService.currentId$.subscribe((id) => {
      this._loadData(id);
    }));
  }

  ngOnDestroy(): void {
    // TODO better solution
    this._isUnloaded = true;
    this._subs.unsubscribe();
  }

  private async _loadData(projectId): Promise<any> {
    const completeState = await this._persistenceService.loadTaskArchiveForProject(projectId);
    if (this._isUnloaded) {
      return;
    }

    if (completeState) {
      const {worklog, totalTimeSpent} = mapArchiveToWorklog(completeState);
      this.worklog = worklog;
      this.totalTimeSpent = totalTimeSpent;
      this._cd.detectChanges();
    } else {
      this.worklog = {};
      this.totalTimeSpent = null;
      this._cd.detectChanges();
    }
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

  restoreTask() {
  }

  sortWorklogItems(a, b) {
    return b.key - a.key;
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
