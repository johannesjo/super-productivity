import {
  AfterViewChecked,
  Attribute,
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  Renderer2
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
import { StringToMsPipe } from './string-to-ms.pipe';
import { MsToStringPipe } from './ms-to-string.pipe';

const noop = () => {
};
/* tslint:disable */
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

/* tslint:enable */

@Directive({
  selector: 'input[inputDuration]',
  // TODO check if needed
  providers: [
    StringToMsPipe,
    MsToStringPipe,
    INPUT_DURATION_VALUE_ACCESSOR,
    INPUT_DURATION_VALIDATORS,
  ],
})

export class InputDurationDirective<D> implements ControlValueAccessor, Validator, AfterViewChecked {
  @Input() isAllowSeconds = false;

  // by the Control Value Accessor
  private _onTouchedCallback: () => void = noop;

  // Placeholders for the callbacks which are later provided
  private _validatorOnChange: (_: any) => void = noop;
  private _onChangeCallback: (_: any) => void = noop;
  // -----------
  private _parseValidator: ValidatorFn = this._parseValidatorFn.bind(this);
  private _validator: ValidatorFn | null;
  private _msValue;

  constructor(@Attribute('inputDuration') public inputDuration,
    private _elementRef: ElementRef,
    private _stringToMs: StringToMsPipe,
    private _msToString: MsToStringPipe,
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
      this._onChangeCallback(this._msValue);
    }
  }

  // TODO all around dirty
  @Input() set ngModel(msVal) {
    if (msVal && msVal !== this._msValue) {
      this._msValue = msVal;
      this.writeValue(msVal);
    }
  }

  @HostListener('input', ['$event.target.value']) _onInput(value: string) {
    this._msValue = this._stringToMs.transform(value);
    this._value = this._msToString.transform(this._msValue, false, true);
    this._onChangeCallback(this._msValue);
  }

  ngAfterViewChecked() {
    this._validator = Validators.compose([this._parseValidator]);
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
    const toStr = this._msToString.transform(value, this.isAllowSeconds, true);
    this._renderer.setProperty(this._elementRef.nativeElement, 'value', toStr);
  }

  private _parseValidatorFn(): ValidationErrors | null {
    // TODO maximum dirty hackyness, but works for now :(
    if (!this._value) {
      this._msValue = this._stringToMs.transform(this._elementRef.nativeElement.value);
      this._value = this._msToString.transform(this._msValue, this.isAllowSeconds, true);
    }
    return this._value
      ? null
      : {inputDurationParse: {text: this._elementRef.nativeElement.value}};
  }
}
