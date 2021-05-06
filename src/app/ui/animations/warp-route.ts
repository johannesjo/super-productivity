import {
  animate,
  animateChild,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ANI_ENTER_TIMING } from './animation.const';

export const warpRouteAnimation = trigger('warpRoute', [
  // transition('* <=> *', [
  //   group([
  //     query(
  //       ':enter',
  //       [
  //         style({
  //           opacity: 0,
  //           transform: 'translateY(9rem) rotate(-10deg)'
  //         }),
  //         animate(
  //           '0.35s cubic-bezier(0, 1.8, 1, 1.8)',
  //           style({opacity: 1, transform: 'translateY(0) rotate(0)'})
  //         ),
  //         animateChild()
  //       ],
  //       {optional: true}
  //     ),
  //     query(
  //       ':leave',
  //       [animate('0.35s', style({opacity: 0})), animateChild()],
  //       {optional: true}
  //     )
  //   ])
  // ])

  transition('* <=> *', [
    /* 1 */ query(
      ':enter, :leave',
      style({ position: 'absolute', width: '100%', minHeight: '100%', height: '100%' }),
      { optional: true },
    ),
    group([
      query(
        ':leave',
        [
          style({ opacity: 1, transform: 'scale(1)' }),
          animate(ANI_ENTER_TIMING, style({ opacity: 0, transform: 'scale(1.1)' })),
          animateChild(),
        ],
        { optional: true },
      ),
      query(
        ':enter',
        [
          style({ opacity: 0, transform: 'scale(1.2)' }),
          animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
          animateChild(),
        ],
        { optional: true },
      ),
    ]),
  ]),
]);
