import { animate, animateChild, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from './animation.const';

export const warpAnimation = [
  trigger('warp', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(1.1)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
      animateChild(),
    ]),
    transition(':leave', [
      style({ opacity: 1, transform: 'scale(1)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 0, transform: 'scale(1.1)' })),
    ]),
  ]),
];

export const warpInAnimation = [
  trigger('warpIn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(1.1)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
      animateChild(),
    ]),
  ]),
];
