import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorklogService } from '../worklog.service';
import { DialogWorklogExportComponent } from '../dialog-worklog-export/dialog-worklog-export.component';
import { MatDialog } from '@angular/material/dialog';
import { WorklogDataForDay } from '../worklog.model';
import { expandAnimation, expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { getDateRangeForWeek } from '../../../util/get-date-range-for-week';
import { getWeekNumber } from '../../../util/get-week-number';
import { Task } from '../../tasks/task.model';
import { TaskService } from '../../tasks/task.service';
import { T } from '../../../t.const';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { DateAdapter } from '@angular/material/core';

@Component({
  selector: 'worklog-week',
  templateUrl: './worklog-week.component.html',
  styleUrls: ['./worklog-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation],
})
export class WorklogWeekComponent {
  visibility: boolean[] = [];
  T: typeof T = T;
  keys: (o: Record<string, unknown>) => string[] = Object.keys;

  constructor(
    public readonly worklogService: WorklogService,
    public readonly simpleCounterService: SimpleCounterService,
    private readonly _matDialog: MatDialog,
    private readonly _taskService: TaskService,
    private _dateAdapter: DateAdapter<unknown>,
  ) {}

  sortDays(a: any, b: any): number {
    return a.key - b.key;
  }

  async exportData(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const weekNr = getWeekNumber(now, this._dateAdapter.getFirstDayOfWeek());

    // get for whole week
    const { rangeStart, rangeEnd } = getDateRangeForWeek(year, weekNr);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart,
        rangeEnd,
      },
    });
  }

  async updateTimeSpentTodayForTask(
    task: Task,
    dateStr: string,
    newVal: number | string,
  ): Promise<void> {
    await this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      },
    });
    this.worklogService.refreshWorklog();
  }

  trackByDay(i: number, day: any): string {
    return day.key;
  }

  trackByLogEntry(i: number, logEntry: WorklogDataForDay): string {
    return logEntry.task.id;
  }
}
