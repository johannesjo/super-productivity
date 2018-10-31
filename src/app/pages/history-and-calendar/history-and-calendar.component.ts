import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'history-and-calendar',
  templateUrl: './history-and-calendar.component.html',
  styleUrls: ['./history-and-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryAndCalendarComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
