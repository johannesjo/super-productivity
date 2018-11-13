import { AfterViewChecked, Attribute, Directive, ElementRef, forwardRef, Renderer2 } from '@angular/core';
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
import { StringToMsPipe } from './string-to-ms.pipe';
import { MsToStringPipe } from './ms-to-string.pipe';

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
  selector: 'input[inputDuration]',
  providers: [
    StringToMsPipe,
    MsToStringPipe,
    INPUT_DURATION_VALUE_ACCESSOR,
    INPUT_DURATION_VALIDATORS,
  ],
  host: {
    '(input)': '_onInput($event.target.value)',
  },
})


export class InputDurationDirective<D> implements ControlValueAccessor, Validator, AfterViewChecked {

  // by the Control Value Accessor
  private _onTouchedCallback: () => void = noop;

  // Placeholders for the callbacks which are later provided
  private _validatorOnChange: (_: any) => void = noop;
  private _onChangeCallback: (_: any) => void = noop;
  // -----------
  private _parseValidator: ValidatorFn = this._parseValidatorFn.bind(this);
  private _validator: ValidatorFn | null;

  constructor(@Attribute('inputDuration') public inputDuration,
              private _elementRef: ElementRef,
              private _stringToMs: StringToMsPipe,
              private _msToString: MsToStringPipe,
              private _renderer: Renderer2) {
  }

  private _value;

  ngAfterViewChecked() {
    this._validator = Validators.compose([this._parseValidator]);
  }

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
    const toStr = this._msToString.transform(value, false, true);
    this._renderer.setProperty(this._elementRef.nativeElement, 'value', toStr);
  }

  // host event handler
  // ------------------
  _onInput(value: string) {
    const msVal = this._stringToMs.transform(value);
    this._value = this._msToString.transform(msVal, false, true);
    this._onChangeCallback(msVal);
  }

  private _parseValidatorFn(): ValidationErrors | null {
    return this._value
      ? null
      : {'inputDurationParse': {'text': this._elementRef.nativeElement.value}};
  }
}
