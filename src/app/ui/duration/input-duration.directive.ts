import {
  AfterViewChecked,
  Attribute,
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
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
import { StringToMsPipe } from './string-to-ms.pipe';
import { MsToStringPipe } from './ms-to-string.pipe';

const noop = (): void => {};
/* eslint-disable */
export const INPUT_DURATION_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => InputDurationDirective),
  multi: true,
};

export const INPUT_DURATION_VALIDATORS: any = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => InputDurationDirective),
  multi: true,
};

const ZERO_VAL = '0m';

/* eslint-enable */

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
export class InputDurationDirective
  implements ControlValueAccessor, Validator, AfterViewChecked
{
  @Input() isAllowSeconds: boolean = false;
  @Input() isValidate: boolean = true;
  @Input() isShowZeroVal: boolean = true;

  // by the Control Value Accessor
  // @ts-ignore
  private _onTouchedCallback: () => void = noop;

  // Placeholders for the callbacks which are later provided
  // @ts-ignore
  private _validatorOnChange: (_: any) => void = noop;
  private _onChangeCallback: (_: any) => void = noop;
  // -----------
  private _parseValidator: ValidatorFn = this._parseValidatorFn.bind(this);
  private _validator: ValidatorFn | undefined | null;
  private _msValue: number | undefined;

  constructor(
    @Attribute('inputDuration') public inputDuration: Attribute,
    private _elementRef: ElementRef,
    private _stringToMs: StringToMsPipe,
    private _msToString: MsToStringPipe,
    private _renderer: Renderer2,
  ) {}

  private _value: string | undefined;

  // Validations
  get value(): string {
    return this._value || '';
  }

  set value(value: string) {
    if (value !== this._value) {
      this._value = value;
      this._onChangeCallback(this._msValue);
    }
  }

  // TODO all around dirty
  @Input() set ngModel(msVal: number) {
    if (msVal && msVal !== this._msValue) {
      this._msValue = msVal;
      this.writeValue(msVal.toString());
    }
  }

  @HostListener('input', ['$event.target.value']) _onInput(value: string): void {
    this._msValue = this._stringToMs.transform(value);
    this._value = this._msToString.transform(this._msValue, false, true);
    this._onChangeCallback(this._msValue);
  }

  ngAfterViewChecked(): void {
    this._validator = Validators.compose([this._parseValidator]);
  }

  /* eslint-enable */

  // ControlValueAccessor interface
  registerOnValidatorChange(fn: () => void): void {
    this._validatorOnChange = fn;
  }

  // ControlValueAccessor interface
  registerOnChange(fn: any): void {
    this._onChangeCallback = fn;
  }

  // ControlValueAccessor interface
  registerOnTouched(fn: any): void {
    this._onTouchedCallback = fn;
  }

  // ControlValueAccessor: Validator
  validate(c: AbstractControl): ValidationErrors | null {
    return this._validator !== null && this._validator !== undefined && this.isValidate
      ? this._validator(c)
      : null;
  }

  // ControlValueAccessor: Formatter
  writeValue(value: string): void {
    if (!value) {
      value = '';
    }
    const toStr = this._msToString.transform(value, this.isAllowSeconds, true);
    this._renderer.setProperty(
      this._elementRef.nativeElement,
      'value',
      this.isShowZeroVal ? toStr || ZERO_VAL : toStr,
    );
  }

  private _parseValidatorFn(): ValidationErrors | null {
    // TODO maximum dirty hackyness, but works for now :(
    if (!this._value) {
      this._msValue = this._stringToMs.transform(this._elementRef.nativeElement.value);
      this._value = this._msToString.transform(this._msValue, this.isAllowSeconds, true);
    }
    return this._value
      ? null
      : { inputDurationParse: { text: this._elementRef.nativeElement.value } };
  }
}
