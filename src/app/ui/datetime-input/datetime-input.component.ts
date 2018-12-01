import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'datetime-input',
  templateUrl: './datetime-input.component.html',
  styleUrls: ['./datetime-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatetimeInputComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
