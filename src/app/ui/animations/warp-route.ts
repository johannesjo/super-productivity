import { animate, animateChild, group, query, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from './animation.const';

export const warpRouteAnimation =
  trigger('warpRoute', [
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
      group([
        query(
          ':enter',
          [
            style({opacity: 0, transform: 'scale(1.7)'}),
            animate(ANI_ENTER_TIMING, style({opacity: 1, transform: 'scale(1)'})),
            animateChild()
          ],
          {optional: true},
        ),
        query(
          ':leave',
          [
            animate(ANI_LEAVE_TIMING, style({opacity: 0})),
            animateChild()
          ],
          {optional: true},
        ),
      ])
    ])
  ]);
