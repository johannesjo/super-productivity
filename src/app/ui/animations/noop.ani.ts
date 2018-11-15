import { transition, trigger } from '@angular/animations';

export const noopAnimation = trigger(
  'noop',
  [
    transition(':enter', [])
  ]
);
