import {ChangeDetectionStrategy, Component} from '@angular/core';
import {WorklogService} from '../worklog.service';
import {DialogWorklogExportComponent} from '../dialog-worklog-export/dialog-worklog-export.component';
import {MatDialog} from '@angular/material/dialog';
import {WorklogDataForDay} from '../worklog.model';
import {expandAnimation, expandFadeAnimation} from '../../../ui/animations/expand.ani';
import {fadeAnimation} from '../../../ui/animations/fade.ani';
import {getDateRangeForWeek} from '../../../util/get-date-range-for-week';
import {getWeekNumber} from '../../../util/get-week-number';
import {Task} from '../../tasks/task.model';
import {TaskService} from '../../tasks/task.service';
import {T} from '../../../t.const';

@Component({
  selector: 'worklog-week',
  templateUrl: './worklog-week.component.html',
  styleUrls: ['./worklog-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation]
})
export class WorklogWeekComponent {
  visibility: boolean[] = [];
  T = T;
  keys = Object.keys;

  constructor(
    public readonly worklogService: WorklogService,
    private readonly _matDialog: MatDialog,
    private readonly _taskService: TaskService,
  ) {
  }

  sortDays(a, b) {
    return a.key - b.key;
  }

  async exportData() {
    const now = new Date();
    const year = now.getFullYear();
    const weekNr = getWeekNumber(now);

    // get for whole week
    const {rangeStart, rangeEnd} = getDateRangeForWeek(year, weekNr);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart,
        rangeEnd,
      }
    });
  }

  async updateTimeSpentTodayForTask(task: Task, dateStr: string, newVal: number | string) {
    await this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      }
    });
    this.worklogService.refreshWorklog();
  }

  trackByDay(i, day) {
    return day.key;
  }

  trackByLogEntry(i, logEntry: WorklogDataForDay) {
    return logEntry.task.id;
  }
}
