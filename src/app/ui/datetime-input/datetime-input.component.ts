import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'datetime-input',
  templateUrl: './datetime-input.component.html',
  styleUrls: ['./datetime-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatetimeInputComponent {
  @Input() name: string;
  @Input() placeholder: string;
  @Input() required: boolean;
  @Output() modelChange = new EventEmitter();

  @Input() get model() {
    return this.modelValue;
  }

  modelValue: string;

  set model(val) {
    this.modelValue = val;
    const timestamp = val && new Date(val).getTime();
    // TODO add real validation
    if (timestamp) {
      this.modelChange.emit(this.modelValue);
    }
  }

  constructor() {
  }

  setVal(type: string) {
    const offset = new Date().getTimezoneOffset();
    const date = new Date(Date.now() - (offset * 1000 * 60));
    date.setSeconds(0, 0);

    switch (type) {
      case '1H':
        date.setHours(date.getHours() + 1);
        break;
      case '2H':
        date.setHours(date.getHours() + 2);
        break;
      case '5H':
        date.setHours(date.getHours() + 5);
        break;
      case 'TOMORROW_11':
        date.setHours(11, 0, 0, 0);
        date.setDate(date.getDate() + 1);
        break;
    }

    this.model = this._convertDate(date);
  }

  private _convertDate(date: Date): string {
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }

}
