import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

export const minValidator = (min: number): ValidatorFn => {
  return (
    control: AbstractControl,
  ): {
    [key: string]: unknown;
  } | null => {
    if (!min || Validators.required(control)) {
      return null;
    }

    const v: number = +control.value;
    return v >= +min ? null : { actualValue: v, requiredValue: +min, min: true };
  };
};
