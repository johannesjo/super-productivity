import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { T } from 'src/app/t.const';

@Component({
  selector: 'owl-wrapper',
  templateUrl: './owl-wrapper.component.html',
  styleUrls: ['./owl-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwlWrapperComponent {
  @Input() now: Date = new Date();

  @Input() model?: number;

  dateTime?: number;

  @Output()
  dateTimeChange: EventEmitter<number> = new EventEmitter();

  @Output()
  triggerSubmit: EventEmitter<number> = new EventEmitter();
  T: typeof T = T;
  date: Date = new Date();
  laterTodaySlots: string[] = [
    '9:00',
    '15:00',
    '17:00',
    '19:00',
    '21:00',
    '22:00',
    '23:30',
  ];

  constructor() {
  }

  @Input('dateTime')
  set dateTimeSet(v: number) {
    this.dateTime = v;
    // NOTE: owl doesn't with undefined...
    if (v) {
      this.date = new Date(v);
    }
  }

  submit() {
    this.triggerSubmit.emit(this.dateTime);
  }

  updateDateFromCal(date: any) {
    this.dateTime = new Date(date).getTime();
    this.dateTimeChange.emit(this.dateTime);
  }
}
