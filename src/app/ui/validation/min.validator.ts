import {AbstractControl, ValidatorFn, Validators} from '@angular/forms';

export const minValidator = (min_: number): ValidatorFn => {
  return (control: AbstractControl): { [key: string]: any } => {
    if (!min_ || Validators.required(control)) {
      return null;
    }

    const v: number = +control.value;
    return v >= +min_
      ? null
      : {actualValue: v, requiredValue: +min_, min: true};
  };
};
