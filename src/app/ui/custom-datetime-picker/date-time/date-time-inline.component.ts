/**
 * date-time-inline.component
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { OwlDateTime, PickerMode, PickerType, SelectMode } from './date-time.class';
import { DateTimeAdapter } from './adapter/date-time-adapter.class';
import {
  OWL_DATE_TIME_FORMATS,
  OwlDateTimeFormats,
} from './adapter/date-time-format.class';
import { OwlDateTimeContainerComponent } from './date-time-picker-container.component';

export const OWL_DATETIME_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => OwlDateTimeInlineComponent),
  multi: true,
};

@Component({
  selector: 'owl-date-time-inline',
  templateUrl: './date-time-inline.component.html',
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.owl-dt-inline]': 'owlDTInlineClass',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  providers: [OWL_DATETIME_VALUE_ACCESSOR],
})
export class OwlDateTimeInlineComponent<T>
  extends OwlDateTime<T>
  implements OnInit, ControlValueAccessor
{
  @ViewChild(OwlDateTimeContainerComponent, { static: true })
  container!: OwlDateTimeContainerComponent<T>;
  /**
   * Emits selected year in multi-year view
   * This doesn't imply a change on the selected date.
   * */
  @Output()
  yearSelected = new EventEmitter<T>();
  /**
   * Emits selected month in year view
   * This doesn't imply a change on the selected date.
   * */
  @Output()
  monthSelected = new EventEmitter<T>();
  @Output()
  ngModelChange = new EventEmitter<T>();
  /** The minimum valid date. */
  private _min!: T | null;
  /** The maximum valid date. */
  private _max!: T | null;

  constructor(
    protected changeDetector: ChangeDetectorRef,
    // @Optional()
    protected override dateTimeAdapter: DateTimeAdapter<T>,
    // @Optional()
    // TODO check all
    // @ts-ignore
    @Inject(OWL_DATE_TIME_FORMATS)
    protected dateTimeFormats: OwlDateTimeFormats,
  ) {
    super(dateTimeAdapter, dateTimeFormats);
  }

  /**
   * Set the type of the dateTime picker
   *      'both' -- show both calendar and timer
   *      'calendar' -- show only calendar
   *      'timer' -- show only timer
   */
  private _pickerType: PickerType = 'both';

  @Input()
  get pickerType(): PickerType {
    return this._pickerType;
  }

  set pickerType(val: PickerType) {
    if (val !== this._pickerType) {
      this._pickerType = val;
    }
  }

  private _disabled = false;

  @Input()
  override get disabled(): boolean {
    return !!this._disabled;
  }

  override set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
  }

  private _selectMode: SelectMode = 'single';

  @Input()
  get selectMode(): SelectMode {
    return this._selectMode;
  }

  set selectMode(mode: SelectMode) {
    if (
      mode !== 'single' &&
      mode !== 'range' &&
      mode !== 'rangeFrom' &&
      mode !== 'rangeTo'
    ) {
      throw Error('OwlDateTime Error: invalid selectMode value!');
    }

    this._selectMode = mode;
  }

  /** The date to open the calendar to initially. */
  private _startAt!: T | null;

  @Input()
  get startAt(): T | null {
    if (this._startAt) {
      return this._startAt;
    }

    if (this.selectMode === 'single') {
      return this.value || null;
    } else if (this.selectMode === 'range' || this.selectMode === 'rangeFrom') {
      return this.values[0] || null;
    } else if (this.selectMode === 'rangeTo') {
      return this.values[1] || null;
    } else {
      return null;
    }
  }

  set startAt(date: T | null) {
    this._startAt = this.getValidDate(this.dateTimeAdapter.deserialize(date));
  }

  /** The date to open for range calendar. */
  private _endAt!: T | null;

  @Input()
  get endAt(): T | null {
    if (this._endAt) {
      return this._endAt;
    }

    if (this.selectMode === 'single') {
      return this.value || null;
    } else if (this.selectMode === 'range' || this.selectMode === 'rangeFrom') {
      return this.values[1] || null;
    } else {
      return null;
    }
  }

  set endAt(date: T | null) {
    this._endAt = this.getValidDate(this.dateTimeAdapter.deserialize(date));
  }

  private _dateTimeFilter!: (date: T | null) => boolean;

  @Input('owlDateTimeFilter')
  get dateTimeFilter(): (date: T | null) => boolean {
    return this._dateTimeFilter;
  }

  set dateTimeFilter(filter: (date: T | null) => boolean) {
    this._dateTimeFilter = filter;
  }

  get minDateTime(): T | null {
    return this._min || null;
  }

  @Input('min')
  set minDateTime(value: T | null) {
    this._min = this.getValidDate(this.dateTimeAdapter.deserialize(value));
    this.changeDetector.markForCheck();
  }

  get maxDateTime(): T | null {
    return this._max || null;
  }

  @Input('max')
  set maxDateTime(value: T | null) {
    this._max = this.getValidDate(this.dateTimeAdapter.deserialize(value));
    this.changeDetector.markForCheck();
  }

  private _value: T | null | undefined;

  @Input()
  get value(): T | null {
    // @ts-ignore
    return this._value;
  }

  set value(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    value = this.getValidDate(value);
    this._value = value;
    this.selected = value;
  }

  private _values: T[] = [];

  @Input()
  get values(): T[] {
    return this._values;
  }

  set values(values: T[]) {
    if (values && values.length > 0) {
      // @ts-ignore
      values = values.map((v) => {
        // @ts-ignore
        v = this.dateTimeAdapter.deserialize(v);
        // @ts-ignore
        v = this.getValidDate(v);
        return v ? this.dateTimeAdapter.clone(v) : null;
      });
      this._values = [...values];
      this.selecteds = [...values];
    } else {
      this._values = [];
      this.selecteds = [];
    }
  }

  private _selected!: T | null;

  get selected(): T | null {
    return this._selected;
  }

  set selected(value: T | null) {
    this._selected = value;
    this.changeDetector.markForCheck();
  }

  private _selecteds: T[] = [];

  get selecteds(): T[] {
    return this._selecteds;
  }

  set selecteds(values: T[]) {
    this._selecteds = values;
    this.changeDetector.markForCheck();
  }

  get opened(): boolean {
    return true;
  }

  get pickerMode(): PickerMode {
    return 'inline';
  }

  get isInSingleMode(): boolean {
    return this._selectMode === 'single';
  }

  get isInRangeMode(): boolean {
    return (
      this._selectMode === 'range' ||
      this._selectMode === 'rangeFrom' ||
      this._selectMode === 'rangeTo'
    );
  }

  get owlDTInlineClass(): boolean {
    return true;
  }

  ngOnInit(): void {
    this.container.picker = this;
  }

  writeValue(value: any): void {
    if (this.isInSingleMode) {
      this.value = value;
      this.container.pickerMoment = value;
    } else {
      this.values = value;
      this.container.pickerMoment = this._values[this.container.activeSelectedIndex];
    }
  }

  registerOnChange(fn: any): void {
    this.onModelChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onModelTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  select(date: T[] | T): void {
    if (this.disabled) {
      return;
    }

    if (Array.isArray(date)) {
      this.values = [...date];
    } else {
      this.value = date;
    }
    this.onModelChange(date);
    this.onModelTouched();
  }

  /**
   * Emits the selected year in multi-year view
   * */
  selectYear(normalizedYear: T): void {
    this.yearSelected.emit(normalizedYear);
  }

  /**
   * Emits selected month in year view
   * */
  selectMonth(normalizedMonth: T): void {
    this.monthSelected.emit(normalizedMonth);
  }

  private onModelChange(date): void {
    this.ngModelChange.emit(date);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private onModelTouched: Function = () => {};
}
