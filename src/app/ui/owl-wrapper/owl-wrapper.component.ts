import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {T} from 'src/app/t.const';

@Component({
  selector: 'owl-wrapper',
  templateUrl: './owl-wrapper.component.html',
  styleUrls: ['./owl-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwlWrapperComponent {
  @Input()
  now = new Date();

  @Input()
  model: number;

  @Input()
  dateTime: number;

  @Output()
  dateTimeChange = new EventEmitter<number>();

  @Output()
  triggerSubmit = new EventEmitter<number>();

  T = T;
  date = new Date();

  constructor() {
  }


  updateDateFromCal(date) {
    this.dateTime = new Date(date).getTime();
    this.dateTimeChange.emit(this.dateTime);
  }
}
