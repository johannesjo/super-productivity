import { Attribute, Directive, ElementRef, forwardRef, Renderer2 } from '@angular/core';
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

import { DurationFromStringPipe } from './duration-from-string.pipe';
import { DurationToStringPipe } from './duration-to-string.pipe';

const noop = () => {
};

export const INPUT_DURATION_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => InputDurationDirective),
  multi: true
};

export const INPUT_DURATION_VALIDATORS: any = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => InputDurationDirective),
  multi: true
};


@Directive({
  selector: 'input[supInputDuration][ngModel]',
  providers: [
    DurationFromStringPipe,
    DurationToStringPipe,
    INPUT_DURATION_VALUE_ACCESSOR,
    INPUT_DURATION_VALIDATORS,
  ],
  host: {
    '(input)': '_onInput($event.target.value)',
  },
})


export class InputDurationDirective<D> implements ControlValueAccessor,
  Validator {

  // by the Control Value Accessor
  private _onTouchedCallback: () => void = noop;

  // Placeholders for the callbacks which are later provided
  private _validatorOnChange: (_: any) => void = noop;
  private _onChangeCallback: (_: any) => void = noop;
  // -----------
  private _parseValidator: ValidatorFn = (): ValidationErrors | null => {
    return this._value ?
      null : {'inputDurationParse': {'text': this._elementRef.nativeElement.value}};
  };


  // @Input('value') value: string = '';
  /* tslint:disable */
  private _validator: ValidatorFn | null =
    Validators.compose(
      [this._parseValidator]);

  constructor(@Attribute('supInputDuration') public supInputDuration,
              private _elementRef: ElementRef,
              private _durationToString: DurationToStringPipe,
              private _durationFromString: DurationFromStringPipe,
              private _renderer: Renderer2) {
  }

  private _value;


  // Validations

  get value() {
    return this._value;
  }

  set value(value) {
    if (value !== this._value) {
      this._value = value;
      this._onChangeCallback(this._value);
    }
  }

  /* tslint:enable */

  // ControlValueAccessor interface
  registerOnValidatorChange(fn: () => void): void {
    this._validatorOnChange = fn;
  }

  // ControlValueAccessor interface
  registerOnChange(fn: any) {
    this._onChangeCallback = fn;
  }

  // ControlValueAccessor interface
  registerOnTouched(fn: any) {
    this._onTouchedCallback = fn;
  }

  // ControlValueAccessor: Validator
  validate(c: AbstractControl): ValidationErrors | null {
    return this._validator ? this._validator(c) : null;
  }

  // ControlValueAccessor: Formatter
  writeValue(value): void {
    if (!value) {
      value = '';
    }
    this._renderer.setProperty(this._elementRef.nativeElement, 'value', value);
  }

  // host event handler
  // ------------------
  _onInput(value: string) {
    // format to have a standard format for durations
    const momentDuration = this._durationFromString.transform(value);
    this._value = this._durationToString.transform(momentDuration);
    console.log(this._value);

    this._onChangeCallback(this.value);
  }
}
