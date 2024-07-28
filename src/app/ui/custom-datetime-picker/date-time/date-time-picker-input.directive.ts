/**
 * date-time-picker-input.directive
 */

import {
  AfterContentInit,
  Directive,
  ElementRef,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Renderer2,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { DOWN_ARROW } from '@angular/cdk/keycodes';
import { OwlDateTimeComponent } from './date-time-picker.component';
import { DateTimeAdapter } from './adapter/date-time-adapter.class';
import {
  OWL_DATE_TIME_FORMATS,
  OwlDateTimeFormats,
} from './adapter/date-time-format.class';
import { Subscription } from 'rxjs';
import { SelectMode } from './date-time.class';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

export const OWL_DATETIME_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => OwlDateTimeInputDirective),
  multi: true,
};

export const OWL_DATETIME_VALIDATORS: any = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => OwlDateTimeInputDirective),
  multi: true,
};

@Directive({
  selector: 'input[owlDateTime]',
  exportAs: 'owlDateTimeInput',
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(keydown)': 'handleKeydownOnHost($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(blur)': 'handleBlurOnHost($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(input)': 'handleInputOnHost($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '(change)': 'handleChangeOnHost($event)',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.aria-haspopup]': 'owlDateTimeInputAriaHaspopup',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.aria-owns]': 'owlDateTimeInputAriaOwns',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.min]': 'minIso8601',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[attr.max]': 'maxIso8601',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[disabled]': 'owlDateTimeInputDisabled',
  },
  providers: [OWL_DATETIME_VALUE_ACCESSOR, OWL_DATETIME_VALIDATORS],
})
export class OwlDateTimeInputDirective<T>
  implements OnInit, AfterContentInit, OnDestroy, ControlValueAccessor, Validator
{
  /**
   * The character to separate the 'from' and 'to' in input value
   */
  @Input()
  rangeSeparator = '-';
  /**
   * Callback to invoke when `change` event is fired on this `<input>`
   * */
  @Output()
  dateTimeChange = new EventEmitter<any>();
  /**
   * Callback to invoke when an `input` event is fired on this `<input>`.
   * */
  @Output()
  dateTimeInput = new EventEmitter<any>();
  /** The date-time-picker that this input is associated with. */
  dtPicker!: OwlDateTimeComponent<T>;
  /** Emits when the value changes (either due to user input or programmatic change). */
  valueChange = new EventEmitter<T[] | T | null>();
  /** Emits when the disabled state has changed */
  disabledChange = new EventEmitter<boolean>();
  private dtPickerSub: Subscription = Subscription.EMPTY;
  private localeSub: Subscription = Subscription.EMPTY;
  private lastValueValid = true;

  constructor(
    private elmRef: ElementRef,
    private renderer: Renderer2,
    // TODO check all
    // @ts-ignore
    @Optional()
    private dateTimeAdapter: DateTimeAdapter<T>,
    // @ts-ignore
    @Optional()
    // @ts-ignore
    @Inject(OWL_DATE_TIME_FORMATS)
    private dateTimeFormats: OwlDateTimeFormats,
  ) {
    if (!this.dateTimeAdapter) {
      throw Error(
        `OwlDateTimePicker: No provider found for DateTimePicker. You must import one of the following ` +
          `modules at your application root: OwlNativeDateTimeModule, OwlMomentDateTimeModule, or provide a ` +
          `custom implementation.`,
      );
    }

    if (!this.dateTimeFormats) {
      throw Error(
        `OwlDateTimePicker: No provider found for OWL_DATE_TIME_FORMATS. You must import one of the following ` +
          `modules at your application root: OwlNativeDateTimeModule, OwlMomentDateTimeModule, or provide a ` +
          `custom implementation.`,
      );
    }

    this.localeSub = this.dateTimeAdapter.localeChanges.subscribe(() => {
      this.value = this.value;
    });
  }

  /**
   * Required flag to be used for range of [null, null]
   * */
  private _required!: boolean;

  @Input()
  get required(): boolean {
    return this._required;
  }

  set required(value: boolean) {
    this._required = value;
    this.validatorOnChange();
  }

  /**
   * The date time picker that this input is associated with.
   * */
  @Input()
  set owlDateTime(value: OwlDateTimeComponent<T>) {
    this.registerDateTimePicker(value);
  }

  /**
   * A function to filter date time
   */
  @Input()
  set owlDateTimeFilter(filter: (date: T | null) => boolean) {
    this._dateTimeFilter = filter;
    this.validatorOnChange();
  }

  private _dateTimeFilter!: (date: T | null) => boolean;

  get dateTimeFilter(): (date: T | null) => boolean {
    return this._dateTimeFilter;
  }

  /** Whether the date time picker's input is disabled. */
  @Input()
  private _disabled!: boolean;

  get disabled(): boolean {
    return !!this._disabled;
  }

  set disabled(value: boolean) {
    const newValue = coerceBooleanProperty(value);
    const element = this.elmRef.nativeElement;

    if (this._disabled !== newValue) {
      this._disabled = newValue;
      this.disabledChange.emit(newValue);
    }

    // We need to null check the `blur` method, because it's undefined during SSR.
    if (newValue && element.blur) {
      // Normally, native input elements automatically blur if they turn disabled. This behavior
      // is problematic, because it would mean that it triggers another change detection cycle,
      // which then causes a changed after checked error if the input element was focused before.
      element.blur();
    }
  }

  /** The minimum valid date. */
  private _min!: T | null;

  @Input()
  get min(): T | null {
    return this._min;
  }

  set min(value: T | null) {
    this._min = this.getValidDate(this.dateTimeAdapter.deserialize(value));
    this.validatorOnChange();
  }

  /** The maximum valid date. */
  private _max!: T | null;

  @Input()
  get max(): T | null {
    return this._max;
  }

  set max(value: T | null) {
    this._max = this.getValidDate(this.dateTimeAdapter.deserialize(value));
    this.validatorOnChange();
  }

  /**
   * The picker's select mode
   */
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

  private _value!: T | null;

  @Input()
  get value(): T | null {
    return this._value;
  }

  set value(value: T | null) {
    value = this.dateTimeAdapter.deserialize(value);
    this.lastValueValid = !value || this.dateTimeAdapter.isValid(value);
    value = this.getValidDate(value);
    const oldDate = this._value;
    this._value = value;

    // set the input property 'value'
    this.formatNativeInputValue();

    // check if the input value changed
    // @ts-ignore
    if (!this.dateTimeAdapter.isEqual(oldDate, value)) {
      this.valueChange.emit(value);
    }
  }

  private _values: T[] = [];

  @Input()
  get values(): T[] {
    return this._values;
  }

  set values(values: T[]) {
    if (values && values.length > 0) {
      // @ts-ignore
      this._values = values.map((v) => {
        // @ts-ignore
        v = this.dateTimeAdapter.deserialize(v);
        return this.getValidDate(v);
      });
      this.lastValueValid =
        (!this._values[0] || this.dateTimeAdapter.isValid(this._values[0])) &&
        (!this._values[1] || this.dateTimeAdapter.isValid(this._values[1]));
    } else {
      this._values = [];
      this.lastValueValid = true;
    }

    // set the input property 'value'
    this.formatNativeInputValue();

    this.valueChange.emit(this._values);
  }

  get elementRef(): ElementRef {
    return this.elmRef;
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

  get owlDateTimeInputAriaHaspopup(): boolean {
    return true;
  }

  get owlDateTimeInputAriaOwns(): string {
    // TODO checkall
    // @ts-ignore
    return (this.dtPicker.opened && this.dtPicker.id) || null;
  }

  get minIso8601(): string {
    // @ts-ignore
    return this.min ? this.dateTimeAdapter.toIso8601(this.min) : null;
  }

  get maxIso8601(): string {
    // @ts-ignore
    return this.max ? this.dateTimeAdapter.toIso8601(this.max) : null;
  }

  get owlDateTimeInputDisabled(): boolean {
    return this.disabled;
  }

  ngOnInit(): void {
    if (!this.dtPicker) {
      throw Error(
        `OwlDateTimePicker: the picker input doesn't have any associated owl-date-time component`,
      );
    }
  }

  ngAfterContentInit(): void {
    this.dtPickerSub = this.dtPicker.confirmSelectedChange.subscribe(
      (selecteds: T[] | T) => {
        if (Array.isArray(selecteds)) {
          this.values = selecteds;
        } else {
          this.value = selecteds;
        }

        this.onModelChange(selecteds);
        this.onModelTouched();
        this.dateTimeChange.emit({
          source: this,
          value: selecteds,
          input: this.elmRef.nativeElement,
        });
        this.dateTimeInput.emit({
          source: this,
          value: selecteds,
          input: this.elmRef.nativeElement,
        });
      },
    );
  }

  ngOnDestroy(): void {
    this.dtPickerSub.unsubscribe();
    this.localeSub.unsubscribe();
    this.valueChange.complete();
    this.disabledChange.complete();
  }

  writeValue(value: any): void {
    if (this.isInSingleMode) {
      this.value = value;
    } else {
      this.values = value;
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

  validate(c: AbstractControl): { [key: string]: any } {
    // @ts-ignore
    return this.validator ? this.validator(c) : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.validatorOnChange = fn;
  }

  /**
   * Open the picker when user hold alt + DOWN_ARROW
   * */
  handleKeydownOnHost(event: KeyboardEvent): void {
    if (event.altKey && event.keyCode === DOWN_ARROW) {
      this.dtPicker.open();
      event.preventDefault();
    }
  }

  handleBlurOnHost(event: Event): void {
    this.onModelTouched();
  }

  handleInputOnHost(event: any): void {
    const value = event.target.value;
    if (this._selectMode === 'single') {
      this.changeInputInSingleMode(value);
    } else if (this._selectMode === 'range') {
      this.changeInputInRangeMode(value);
    } else {
      this.changeInputInRangeFromToMode(value);
    }
  }

  handleChangeOnHost(event: any): void {
    let v;
    if (this.isInSingleMode) {
      v = this.value;
    } else if (this.isInRangeMode) {
      v = this.values;
    }

    this.dateTimeChange.emit({
      source: this,
      value: v,
      input: this.elmRef.nativeElement,
    });
  }

  /**
   * Set the native input property 'value'
   */
  formatNativeInputValue(): void {
    if (this.isInSingleMode) {
      this.renderer.setProperty(
        this.elmRef.nativeElement,
        'value',
        this._value
          ? this.dateTimeAdapter.format(this._value, this.dtPicker.formatString)
          : '',
      );
    } else if (this.isInRangeMode) {
      if (this._values && this.values.length > 0) {
        const from = this._values[0];
        const to = this._values[1];

        const fromFormatted = from
          ? this.dateTimeAdapter.format(from, this.dtPicker.formatString)
          : '';
        const toFormatted = to
          ? this.dateTimeAdapter.format(to, this.dtPicker.formatString)
          : '';

        if (!fromFormatted && !toFormatted) {
          this.renderer.setProperty(this.elmRef.nativeElement, 'value', null);
        } else {
          if (this._selectMode === 'range') {
            this.renderer.setProperty(
              this.elmRef.nativeElement,
              'value',
              fromFormatted + ' ' + this.rangeSeparator + ' ' + toFormatted,
            );
          } else if (this._selectMode === 'rangeFrom') {
            this.renderer.setProperty(this.elmRef.nativeElement, 'value', fromFormatted);
          } else if (this._selectMode === 'rangeTo') {
            this.renderer.setProperty(this.elmRef.nativeElement, 'value', toFormatted);
          }
        }
      } else {
        this.renderer.setProperty(this.elmRef.nativeElement, 'value', '');
      }
    }

    return;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private onModelChange: Function = () => {};

  // eslint-disable-next-line @typescript-eslint/ban-types
  private onModelTouched: Function = () => {};

  // eslint-disable-next-line @typescript-eslint/ban-types
  private validatorOnChange: Function = () => {};

  /** The form control validator for whether the input parses. */
  private parseValidator: ValidatorFn = (): ValidationErrors | null => {
    return this.lastValueValid
      ? null
      : { owlDateTimeParse: { text: this.elmRef.nativeElement.value } };
  };

  /** The form control validator for the min date. */
  private minValidator: ValidatorFn = (
    control: AbstractControl,
    // @ts-ignore
  ): ValidationErrors | null => {
    if (this.isInSingleMode) {
      const controlValue = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value),
      );
      return !this.min ||
        !controlValue ||
        this.dateTimeAdapter.compare(this.min, controlValue) <= 0
        ? null
        : { owlDateTimeMin: { min: this.min, actual: controlValue } };
    } else if (this.isInRangeMode && control.value) {
      const controlValueFrom = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value[0]),
      );
      const controlValueTo = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value[1]),
      );
      return !this.min ||
        !controlValueFrom ||
        !controlValueTo ||
        this.dateTimeAdapter.compare(this.min, controlValueFrom) <= 0
        ? null
        : {
            owlDateTimeMin: {
              min: this.min,
              actual: [controlValueFrom, controlValueTo],
            },
          };
    }
  };

  /** The form control validator for the max date. */
  private maxValidator: ValidatorFn = (
    control: AbstractControl,
    // @ts-ignore
  ): ValidationErrors | null => {
    if (this.isInSingleMode) {
      const controlValue = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value),
      );
      return !this.max ||
        !controlValue ||
        this.dateTimeAdapter.compare(this.max, controlValue) >= 0
        ? null
        : { owlDateTimeMax: { max: this.max, actual: controlValue } };
    } else if (this.isInRangeMode && control.value) {
      const controlValueFrom = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value[0]),
      );
      const controlValueTo = this.getValidDate(
        this.dateTimeAdapter.deserialize(control.value[1]),
      );
      return !this.max ||
        !controlValueFrom ||
        !controlValueTo ||
        this.dateTimeAdapter.compare(this.max, controlValueTo) >= 0
        ? null
        : {
            owlDateTimeMax: {
              max: this.max,
              actual: [controlValueFrom, controlValueTo],
            },
          };
    }
  };

  /** The form control validator for the date filter. */
  private filterValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const controlValue = this.getValidDate(
      this.dateTimeAdapter.deserialize(control.value),
    );
    return !this._dateTimeFilter || !controlValue || this._dateTimeFilter(controlValue)
      ? null
      : { owlDateTimeFilter: true };
  };

  /**
   * The form control validator for the range.
   * Check whether the 'before' value is before the 'to' value
   * */
  private rangeValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (this.isInSingleMode || !control.value) {
      return null;
    }

    const controlValueFrom = this.getValidDate(
      this.dateTimeAdapter.deserialize(control.value[0]),
    );
    const controlValueTo = this.getValidDate(
      this.dateTimeAdapter.deserialize(control.value[1]),
    );

    return !controlValueFrom ||
      !controlValueTo ||
      this.dateTimeAdapter.compare(controlValueFrom, controlValueTo) <= 0
      ? null
      : { owlDateTimeRange: true };
  };

  /**
   * The form control validator for the range when required.
   * Check whether the 'before' and 'to' values are present
   * */
  private requiredRangeValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    if (this.isInSingleMode || !control.value || !this.required) {
      return null;
    }

    const controlValueFrom = this.getValidDate(
      this.dateTimeAdapter.deserialize(control.value[0]),
    );
    const controlValueTo = this.getValidDate(
      this.dateTimeAdapter.deserialize(control.value[1]),
    );

    return !controlValueFrom || !controlValueTo
      ? { owlRequiredDateTimeRange: [controlValueFrom, controlValueTo] }
      : null;
  };

  /** The combined form control validator for this input. */
  private validator: ValidatorFn | null = Validators.compose([
    this.parseValidator,
    this.minValidator,
    this.maxValidator,
    this.filterValidator,
    this.rangeValidator,
    this.requiredRangeValidator,
  ]);

  /**
   * Register the relationship between this input and its picker component
   */
  private registerDateTimePicker(picker: OwlDateTimeComponent<T>): void {
    if (picker) {
      this.dtPicker = picker;
      this.dtPicker.registerInput(this);
    }
  }

  /**
   * Convert a given obj to a valid date object
   */
  private getValidDate(obj: any): T | null {
    return this.dateTimeAdapter.isDateInstance(obj) && this.dateTimeAdapter.isValid(obj)
      ? obj
      : null;
  }

  /**
   * Convert a time string to a date-time string
   * When pickerType is 'timer', the value in the picker's input is a time string.
   * The dateTimeAdapter parse fn could not parse a time string to a Date Object.
   * Therefore we need this fn to convert a time string to a date-time string.
   */
  private convertTimeStringToDateTimeString(
    timeString: string,
    dateTime: T,
  ): string | null {
    if (timeString) {
      const v = dateTime || this.dateTimeAdapter.now();
      const dateString = this.dateTimeAdapter.format(
        v,
        this.dateTimeFormats.datePickerInput,
      );
      return dateString + ' ' + timeString;
    } else {
      return null;
    }
  }

  /**
   * Handle input change in single mode
   */
  private changeInputInSingleMode(inputValue: string): void {
    let value = inputValue;
    if (this.dtPicker.pickerType === 'timer') {
      // @ts-ignore
      value = this.convertTimeStringToDateTimeString(value, this.value);
    }

    let result = this.dateTimeAdapter.parse(value, this.dateTimeFormats.parseInput);
    this.lastValueValid = !result || this.dateTimeAdapter.isValid(result);
    result = this.getValidDate(result);

    // if the newValue is the same as the oldValue, we intend to not fire the valueEdited event
    // result equals to null means there is input event, but the input value is invalid
    if (!this.isSameValue(result, this._value) || result === null) {
      this._value = result;
      this.valueChange.emit(result);
      this.onModelChange(result);
      this.dateTimeInput.emit({
        source: this,
        value: result,
        input: this.elmRef.nativeElement,
      });
    }
  }

  /**
   * Handle input change in rangeFrom or rangeTo mode
   */
  private changeInputInRangeFromToMode(inputValue: string): void {
    const originalValue =
      this._selectMode === 'rangeFrom' ? this._values[0] : this._values[1];

    if (this.dtPicker.pickerType === 'timer') {
      // @ts-ignore
      inputValue = this.convertTimeStringToDateTimeString(inputValue, originalValue);
    }

    let result = this.dateTimeAdapter.parse(inputValue, this.dateTimeFormats.parseInput);
    this.lastValueValid = !result || this.dateTimeAdapter.isValid(result);
    result = this.getValidDate(result);

    // if the newValue is the same as the oldValue, we intend to not fire the valueEdited event
    if (
      (this._selectMode === 'rangeFrom' &&
        this.isSameValue(result, this._values[0]) &&
        result) ||
      (this._selectMode === 'rangeTo' &&
        this.isSameValue(result, this._values[1]) &&
        result)
    ) {
      return;
    }

    // @ts-ignore
    this._values =
      this._selectMode === 'rangeFrom'
        ? [result, this._values[1]]
        : [this._values[0], result];
    this.valueChange.emit(this._values);
    this.onModelChange(this._values);
    this.dateTimeInput.emit({
      source: this,
      value: this._values,
      input: this.elmRef.nativeElement,
    });
  }

  /**
   * Handle input change in range mode
   */
  private changeInputInRangeMode(inputValue: string): void {
    const selecteds = inputValue.split(this.rangeSeparator);
    let fromString = selecteds[0];
    let toString = selecteds[1];

    if (this.dtPicker.pickerType === 'timer') {
      // @ts-ignore
      fromString = this.convertTimeStringToDateTimeString(fromString, this.values[0]);
      // @ts-ignore
      toString = this.convertTimeStringToDateTimeString(toString, this.values[1]);
    }

    let from = this.dateTimeAdapter.parse(fromString, this.dateTimeFormats.parseInput);
    let to = this.dateTimeAdapter.parse(toString, this.dateTimeFormats.parseInput);
    this.lastValueValid =
      (!from || this.dateTimeAdapter.isValid(from)) &&
      (!to || this.dateTimeAdapter.isValid(to));
    from = this.getValidDate(from);
    to = this.getValidDate(to);

    // if the newValue is the same as the oldValue, we intend to not fire the valueEdited event
    if (
      !this.isSameValue(from, this._values[0]) ||
      !this.isSameValue(to, this._values[1]) ||
      (from === null && to === null)
    ) {
      // @ts-ignore
      this._values = [from, to];
      this.valueChange.emit(this._values);
      this.onModelChange(this._values);
      this.dateTimeInput.emit({
        source: this,
        value: this._values,
        input: this.elmRef.nativeElement,
      });
    }
  }

  /**
   * Check if the two value is the same
   */
  private isSameValue(first: T | null, second: T | null): boolean {
    if (first && second) {
      return this.dateTimeAdapter.compare(first, second) === 0;
    }

    return first === second;
  }
}
