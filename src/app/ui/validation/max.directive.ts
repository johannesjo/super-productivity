import {
  Directive,
  forwardRef,
  input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { AbstractControl, NG_VALIDATORS, Validator, ValidatorFn } from '@angular/forms';

import { maxValidator } from './max.validator';

const MAX_VALIDATOR = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => MaxDirective),
  multi: true,
};

@Directive({
  selector: '[max][formControlName],[max][formControl],[max][ngModel]',
  providers: [MAX_VALIDATOR],
})
export class MaxDirective implements Validator, OnInit, OnChanges {
  readonly max = input<number>();

  private _validator?: ValidatorFn;
  private _onChange?: () => void;

  ngOnInit(): void {
    const max = this.max();
    if (typeof max === 'number') {
      this._validator = maxValidator(max);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const key in changes) {
      if (key === 'max') {
        this._validator = maxValidator(changes[key].currentValue);
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
