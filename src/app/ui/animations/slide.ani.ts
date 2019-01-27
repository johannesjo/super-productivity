import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from './animation.const';

export const slideAnimation = [
  trigger('slide', [
    transition(':enter', [
      style({marginTop: '-{{elHeight}}px'}),
      animate(ANI_ENTER_TIMING, style({marginTop: '*'}))
    ], {params: {elHeight: 0}}), // void => *
    transition(':leave', [
      style({marginTop: 0}),
      animate(ANI_LEAVE_TIMING, style({marginTop: '-{{elHeight}}px'}))
    ], {params: {elHeight: 0}})
  ])
];
