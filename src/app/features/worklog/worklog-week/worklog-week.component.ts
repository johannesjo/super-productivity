import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { WorklogService } from '../worklog.service';
import { DialogWorklogExportComponent } from '../dialog-worklog-export/dialog-worklog-export.component';
import { MatDialog } from '@angular/material';
import { WorklogWeek } from '../map-archive-to-worklog';
import { expandAnimation, expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'worklog-week',
  templateUrl: './worklog-week.component.html',
  styleUrls: ['./worklog-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation]
})
export class WorklogWeekComponent implements OnInit {
  // days$ = this._worklogService.currentWeek$;

  constructor(
    public readonly worklogService: WorklogService,
    private readonly _matDialog: MatDialog,
  ) {
  }

  ngOnInit() {
  }

  sortDays(a, b) {
    return a.key - b.key;
  }

  exportData(data: WorklogWeek) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const {rangeStart, rangeEnd, tasks} = this.worklogService.createTaskListForMonth(data, year, month);

    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        tasks,
        rangeStart,
        rangeEnd,
      }
    });
  }
}
