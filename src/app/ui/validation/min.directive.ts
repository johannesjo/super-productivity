import {
  Directive,
  forwardRef,
  input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { AbstractControl, NG_VALIDATORS, Validator, ValidatorFn } from '@angular/forms';

import { minValidator } from './min.validator';

const MIN_VALIDATOR = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => MinDirective),
  multi: true,
};

@Directive({
  selector: '[min][formControlName],[min][formControl],[min][ngModel]',
  providers: [MIN_VALIDATOR],
})
export class MinDirective implements Validator, OnInit, OnChanges {
  readonly min = input<number>();

  private _validator?: ValidatorFn;
  private _onChange?: () => void;

  ngOnInit(): void {
    const min = this.min();
    if (typeof min === 'number') {
      this._validator = minValidator(min);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const key in changes) {
      if (key === 'min') {
        this._validator = minValidator(changes[key].currentValue);
        if (this._onChange) {
          this._onChange();
        }
      }
    }
  }

  validate(c: AbstractControl): { [key: string]: unknown } | null {
    if (this._validator) {
      return this._validator(c) as {
        [key: string]: unknown;
      };
    }
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}
