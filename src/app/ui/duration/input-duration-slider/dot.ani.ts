import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from '../../animations/animation.const';

export const dotAnimation = [
  trigger('dot', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translate(0)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: '*' })),
    ]), // void => *
    transition(':leave', [
      style({ opacity: 1, transform: '*' }),
      animate(ANI_LEAVE_TIMING, style({ opacity: 0, transform: 'translate(0)' })),
    ]),
  ]),
];

// animation: $transition-duration-l ani-circle-reveal $ani-enter-timing;
