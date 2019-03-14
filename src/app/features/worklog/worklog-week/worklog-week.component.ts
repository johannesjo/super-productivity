import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorklogService } from '../worklog.service';
import { DialogWorklogExportComponent } from '../dialog-worklog-export/dialog-worklog-export.component';
import { MatDialog } from '@angular/material';
import { WorklogDataForDay } from '../map-archive-to-worklog';
import { expandAnimation, expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { getDateRangeForWeek } from '../../../util/get-date-range-for-week';
import { getWeekNumber } from '../../../util/get-week-number';

@Component({
  selector: 'worklog-week',
  templateUrl: './worklog-week.component.html',
  styleUrls: ['./worklog-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation]
})
export class WorklogWeekComponent {
  visibility: boolean[] = [];

  constructor(
    public readonly worklogService: WorklogService,
    private readonly _matDialog: MatDialog,
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

  trackByDay(i, day) {
    return day.key;
  }

  trackByLogEntry(i, logEntry: WorklogDataForDay) {
    return logEntry.task.id;
  }
}
