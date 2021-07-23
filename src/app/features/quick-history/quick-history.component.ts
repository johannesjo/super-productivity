import { Component, ChangeDetectionStrategy } from '@angular/core';
import { expandAnimation, expandFadeAnimation } from '../../ui/animations/expand.ani';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { WorklogService } from '../worklog/worklog.service';
import { SimpleCounterService } from '../simple-counter/simple-counter.service';
import { MatDialog } from '@angular/material/dialog';
import { TaskService } from '../tasks/task.service';
import { getWeekNumber } from '../../util/get-week-number';
import { getDateRangeForWeek } from '../../util/get-date-range-for-week';
import { DialogWorklogExportComponent } from '../worklog/dialog-worklog-export/dialog-worklog-export.component';
import { Task } from '../tasks/task.model';
import { WorklogDataForDay } from '../worklog/worklog.model';
import { T } from 'src/app/t.const';

@Component({
  selector: 'quick-history',
  templateUrl: './quick-history.component.html',
  styleUrls: ['./quick-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation],
})
export class QuickHistoryComponent {
  visibility: boolean[] = [];
  T: typeof T = T;
  keys: (o: Record<string, unknown>) => string[] = Object.keys;

  constructor(
    public readonly worklogService: WorklogService,
    public readonly simpleCounterService: SimpleCounterService,
    private readonly _matDialog: MatDialog,
    private readonly _taskService: TaskService,
  ) {
    this.worklogService.quickHistoryWeeks$.subscribe((v) =>
      console.log(`worklogService.quickHistoryWeeks$`, v),
    );
  }

  sortDays(a: any, b: any): number {
    return a.key - b.key;
  }

  async exportData(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const weekNr = getWeekNumber(now);

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
