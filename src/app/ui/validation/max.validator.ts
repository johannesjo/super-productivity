import {AbstractControl, ValidatorFn, Validators} from '@angular/forms';

export const maxValidator = (max_: number): ValidatorFn => {
  return (control: AbstractControl): { [key: string]: any } => {
    if (!max_ || Validators.required(control)) {
      return null;
    }

    const v: number = +control.value;
    return v <= +max_
      ? null
      : {actualValue: v, requiredValue: +max_, max: true};
  };
};
