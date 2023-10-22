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
import { WorklogDataForDay, WorklogDay } from '../worklog/worklog.model';
import { T } from 'src/app/t.const';
import { DateAdapter } from '@angular/material/core';
import { KeyValue } from '@angular/common';

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
    private _dateAdapter: DateAdapter<unknown>,
  ) {
    this.worklogService.quickHistoryWeeks$.subscribe((v) =>
      console.log(`worklogService.quickHistoryWeeks$`, v),
    );
  }

  sortDays(a: KeyValue<string, WorklogDay>, b: KeyValue<string, WorklogDay>): number {
    // avoid comparison by key (day) because a week may span across two months
    return a.value.dateStr.localeCompare(b.value.dateStr);
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
