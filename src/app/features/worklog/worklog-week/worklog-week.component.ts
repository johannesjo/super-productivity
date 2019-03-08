import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { WorklogService } from '../worklog.service';

@Component({
  selector: 'worklog-week',
  templateUrl: './worklog-week.component.html',
  styleUrls: ['./worklog-week.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorklogWeekComponent implements OnInit {
  // days$ = this._worklogService.currentWeek$;

  constructor(
    public readonly worklogService: WorklogService,
  ) {
  }

  ngOnInit() {
  }

  sortDays(a, b) {
    return a.key - b.key;
  }
}
