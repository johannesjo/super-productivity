import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { T } from '../../t.const';
import { LS_LAST_REMINDER_DATE } from '../../core/persistence/ls-keys.const';
import { timestampToDatetimeInputString } from '../../util/timestamp-to-datetime-input-string';

@Component({
  selector: 'datetime-input',
  templateUrl: './datetime-input.component.html',
  styleUrls: ['./datetime-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatetimeInputComponent {
  @Input() name: string | undefined;
  @Input() placeholder: string | undefined;
  @Input() required: boolean | undefined;
  @Output() modelChange: EventEmitter<number> = new EventEmitter();
  nrValue: number | undefined;
  strValue: string | undefined | null;
  lastVal: number | undefined;
  T: typeof T = T;

  constructor() {
    const lastVal = localStorage.getItem(LS_LAST_REMINDER_DATE);
    if (lastVal !== null && +lastVal > Date.now()) {
      this.lastVal = +lastVal;
    }
  }

  get model() {
    return this.nrValue || 0;
  }

  @Input()
  set model(v: number) {
    this._updateValues(v);
  }

  updateFromInput(v: number) {
    this._updateValues(v, true);
  }

  setCommonVal(type: string) {
    const date = new Date();
    date.setSeconds(0, 0);

    switch (type) {
      case '15M':
        date.setMinutes(date.getMinutes() + 15);
        break;
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

    this._updateValues(date.getTime(), false);
  }

  setLastVal() {
    if (this.lastVal) {
      this._updateValues(this.lastVal, false);
    }
  }

  private _updateValues(v: number | Date | string, isFromInput: boolean = false) {
    if (v instanceof Date) {
      v = v.getTime();
    } else if (typeof v === 'string') {
      v = new Date(v).getTime();
    }
    this.nrValue = v;
    this.modelChange.emit(v);

    if (isFromInput) {
      localStorage.setItem(LS_LAST_REMINDER_DATE, v.toString());
    } else {
      // required to update view value
      this.strValue = this._convertToIsoString(v);
    }
  }

  private _convertToIsoString(dateTime: number | undefined): string | null {
    if (!dateTime || dateTime < 10000) {
      return null;
    }
    return timestampToDatetimeInputString(dateTime);
  }

}
