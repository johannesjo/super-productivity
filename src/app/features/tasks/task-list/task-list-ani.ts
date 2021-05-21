import {
  animate,
  keyframes,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ANI_FAST_TIMING } from '../../../ui/animations/animation.const';

const ANI = [
  query(':enter', style({ opacity: 0, height: 0 }), { optional: true }),

  query(
    ':enter',
    stagger('40ms', [
      animate(
        ANI_FAST_TIMING,
        keyframes([
          style({ opacity: 0, height: 0, transform: 'scale(0)', offset: 0 }),
          style({ opacity: 1, height: '*', transform: 'scale(1)', offset: 0.99 }),
          style({ height: 'auto', offset: 1.0 }),
        ]),
      ),
    ]),
    { optional: true },
  ),

  query(
    ':leave',
    stagger('-40ms', [
      style({ transform: 'scale(1)', opacity: 1, height: '*' }),
      animate(ANI_FAST_TIMING, style({ transform: 'scale(0)', height: 0 })),
    ]),
    { optional: true },
  ),

  query(
    '.gu-transit',
    style({
      display: 'none',
      opacity: 0,
      height: 0,
      visibility: 'hidden',
    }),
    { optional: true },
  ),
];

export const taskListAnimation = trigger('taskList', [
  transition(':increment, :decrement', ANI),
  transition('* <=> ALWAYS', ANI),
  transition('* <=> BLOCK', []),
]);
