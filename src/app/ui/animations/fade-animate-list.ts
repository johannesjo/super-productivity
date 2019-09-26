import {animate, animateChild, query, style, transition, trigger} from '@angular/animations';
import {
  ANI_LEAVE_FAST_TIMING,
  ANI_LONG_TIMING
} from './animation.const';

export const fadeListAfterAnimation = [
  trigger('fadeListAfter', [
    transition(':enter', [
      style({opacity: 0}),
      animate(ANI_LONG_TIMING, style({opacity: '*'})),
      // query('@standardList', animateChild()),
    ]), // void => *
    transition(':leave', [
      style({opacity: '*'}),
      animate(ANI_LONG_TIMING, style({opacity: 0}))
    ])
  ])
];
