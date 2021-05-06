import { transition, trigger } from '@angular/animations';

// use on parent to skip initial animation
export const noopAnimation = trigger('noop', [transition(':enter', [])]);
