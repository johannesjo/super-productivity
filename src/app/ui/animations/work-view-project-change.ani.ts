import { animate, animateChild, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from './animation.const';

export const workViewProjectChangeAnimation = [
  trigger('projectChange', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(1.2)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
      animateChild(),
    ]), // void => *
    transition(':leave', [
      style({ opacity: 1, transform: 'scale(1)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 0, transform: 'scale(1.1)' })),
      animateChild(),
    ]),
  ]),
];
