import {
  Directive,
  forwardRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { AbstractControl, NG_VALIDATORS, Validator, ValidatorFn } from '@angular/forms';

import { minValidator } from './min.validator';

const MIN_VALIDATOR: any = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => MinDirective),
  multi: true,
};

@Directive({
  selector: '[min][formControlName],[min][formControl],[min][ngModel]',
  providers: [MIN_VALIDATOR],
})
export class MinDirective implements Validator, OnInit, OnChanges {
  @Input() min?: number;

  private _validator?: ValidatorFn;
  private _onChange?: () => void;

  ngOnInit() {
    if (typeof this.min === 'number') {
      this._validator = minValidator(this.min);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      if (key === 'min') {
        this._validator = minValidator(changes[key].currentValue);
        if (this._onChange) {
          this._onChange();
        }
      }
    }
  }

  validate(c: AbstractControl): { [key: string]: any } | null {
    if (this._validator) {
      return this._validator(c) as { [key: string]: any };
    }
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this._onChange = fn;
  }
}
