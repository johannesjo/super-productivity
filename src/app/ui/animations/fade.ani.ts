import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from './animation.const';

export const fadeAnimation = [
  trigger('fade', [
    transition(':enter', [
      style({opacity: 0}),
      animate(ANI_ENTER_TIMING, style({opacity: 1}))
    ]), // void => *
    transition(':leave', [
      style({opacity: 1}),
      animate(ANI_LEAVE_TIMING, style({opacity: 0}))
    ])
  ])
];
