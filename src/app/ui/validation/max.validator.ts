import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

export const maxValidator = (max: number): ValidatorFn => {
  return (
    control: AbstractControl,
  ): {
    [key: string]: unknown;
  } | null => {
    if (!max || Validators.required(control)) {
      return null;
    }

    const v: number = +control.value;
    return v <= +max ? null : { actualValue: v, requiredValue: +max, max: true };
  };
};
