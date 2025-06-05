import { Directive, forwardRef, HostListener } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { StringToMsPipe } from './string-to-ms.pipe';
import { MsToStringPipe } from './ms-to-string.pipe';

@Directive({
  selector: 'input.time-duration-input',
  providers: [
    StringToMsPipe,
    MsToStringPipe,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputTimeDurationDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: InputTimeDurationDirective,
      multi: true,
    },
  ],
  standalone: true,
})
export class InputTimeDurationDirective implements ControlValueAccessor, Validator {
  // // Form control callbacks
  private _onChange: (value: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  // // Validator related properties
  // private _validator: ((c: AbstractControl) => ValidationErrors | null) | null = null;
  private _validatorOnChange: (value: string) => void = () => {};

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    this._onChange(value);
  }

  @HostListener('blur')
  onBlur(): void {
    this._onTouched();
  }

  writeValue(value: number | null): void {
    //   this._msValue = value;
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this._validatorOnChange = fn;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    console.log(control);
    console.log('Control value: ', control.value);
    const regex = new RegExp('^([0-9]?[0-9]):([0-5][0-9])$');
    const valid = regex.test(control.value);
    return valid ? null : { wrongPattern: true };
  }
}
