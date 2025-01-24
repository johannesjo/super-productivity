import {
  animate,
  animateChild,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  ANI_ENTER_TIMING,
  ANI_LONG_TIMING,
  ANI_VERY_LONG_TIMING,
} from './animation.const';

export const warpRouteAnimation = trigger('warpRoute', [
  transition('* => daily-summary', [
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
          query(
            '.daily-summary-summary, .simple-counter-summary, .day-end-note, mat-tab-group, .back-btn, h1',
            [style({ opacity: 0 })],
          ),

          group([
            animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
            query('h1', [
              style({ opacity: 0 }),
              animate(ANI_LONG_TIMING, style({ opacity: 1 })),
            ]),
          ]),
          query(
            '.daily-summary-summary, .simple-counter-summary, .day-end-note, mat-tab-group, .back-btn',
            [style({ opacity: 0 }), animate(ANI_VERY_LONG_TIMING, style({ opacity: 1 }))],
          ),
          // query('.daily-summary-summary', [
          //   style({ opacity: 0 }),
          //   animate(ANI_ENTER_TIMING, style({ opacity: 1 })),
          // ]),
          // query('.simple-counter-summary, .day-end-note', [
          //   style({ opacity: 0 }),
          //   animate(ANI_ENTER_TIMING, style({ opacity: 1 })),
          // ]),
          // query(' mat-tab-group, .back-btn', [
          //   style({ opacity: 0 }),
          //   animate(ANI_ENTER_TIMING, style({ opacity: 1 })),
          // ]),

          animateChild(),
        ],
        { optional: true },
      ),
    ]),
  ]),

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
