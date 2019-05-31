import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';

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
  @Output() modelChange = new EventEmitter<number>();
  nrValue: number;
  strValue: string;

  constructor() {
  }

  @Input()
  set model(v: number) {
    this._updateValues(v);
  }

  get model() {
    return this.nrValue;
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

    this._updateValues(date.getTime());
  }

  private _updateValues(v: number | Date, isFromInput = false) {
    if (typeof v === 'string') {
      v = new Date(v);
    }
    if (v instanceof Date) {
      v = v.getTime();
    }
    this.nrValue = v;
    this.modelChange.emit(v);

    if (!isFromInput) {
      this.strValue = this._convertToIsoString(v);
    }
  }

  private _convertToIsoString(dateTime: number): string {
    if (!dateTime || dateTime < 10000) {
      return null;
    }
    const date = new Date((dateTime + this._getTimeZoneOffsetInMs()));
    const isoStr = date.toISOString();
    return isoStr.substring(0, isoStr.length - 1);
  }

  private _getTimeZoneOffsetInMs(): number {
    return new Date().getTimezoneOffset() * -60 * 1000;
  }
}
