import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'worklog-and-calendar',
  templateUrl: './worklog-and-calendar.component.html',
  styleUrls: ['./worklog-and-calendar.component.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorklogAndCalendarComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

}
