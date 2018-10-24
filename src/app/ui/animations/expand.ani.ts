import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from './animation.const';

export const expandAnimation = [
  trigger('expand', [
    transition(':enter', [
      style({height: 0}),
      animate(ANI_ENTER_TIMING, style({height: '*'}))
    ]), // void => *
    transition(':leave', [
      animate(ANI_LEAVE_TIMING, style({height: 0}))
    ])
  ])
];
