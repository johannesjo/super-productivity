import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { TRANSITION_DURATION_M } from './animation.const';

const TIMING = `${TRANSITION_DURATION_M} linear`;

export const swirlAnimation = [
  trigger('swirl', [
    transition(':enter', [
      animate(
        TIMING,
        keyframes([
          style({ transform: 'scale(0.5) rotate(-180deg)' }),
          style({ transform: 'scale(1) rotate(-90deg)' }),
          style({ transform: 'scale(1) rotate(0deg)' }),
        ]),
      ),
    ]), // void => *
    transition(':leave', [
      animate(
        TIMING,
        keyframes([
          style({ transform: 'scale(0.5) rotate(-180deg)' }),
          style({ transform: 'scale(1) rotate(-90deg)' }),
          style({ transform: 'scale(1) rotate(0deg)' }),
        ]),
      ),
    ]),
  ]),
];
