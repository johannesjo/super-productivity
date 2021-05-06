import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from './animation.const';

export const slideAnimation = [
  trigger('slide', [
    transition(':enter', [
      style({ marginTop: '-{{elHeight}}px', opacity: 0 }),
      animate(ANI_ENTER_TIMING, style({ marginTop: '*', opacity: 1 })),
    ]), // void => *
    transition(':leave', [
      style({ marginTop: 0, opacity: 1 }),
      animate(ANI_LEAVE_TIMING, style({ marginTop: '-{{elHeight}}px', opacity: 0 })),
    ]),
  ]),
];

// export const slideAnimation = [
//   trigger('slide', [
//     transition(':enter', [
//       style({height: 0, overflow: 'hidden', transform: 'translateY(-120%)'}),
//       animate(ANI_ENTER_TIMING, style({height: '*', transform: 'translateY(0)'}))
//     ]), // void => *
//     transition(':leave', [
//       style({overflow: 'hidden'}),
//       animate(ANI_LEAVE_TIMING, style({height: 0, transform: 'translateY(-120%)'}))
//     ])
//   ])
// ];
