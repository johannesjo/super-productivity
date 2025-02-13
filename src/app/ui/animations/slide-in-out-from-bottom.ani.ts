import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from './animation.const';

export const slideInOutFromBottomAni = [
  trigger('slideInOutFromBottom', [
    transition(':enter', [
      style({ transform: 'translateY(100%)' }),
      animate(ANI_ENTER_TIMING, style({ transform: 'translateY(0)' })),
    ]),

    transition(':leave', [
      style({ transform: 'translateY(0)' }),
      animate(ANI_ENTER_TIMING, style({ transform: 'translateY(100%)' })),
    ]),
  ]),
];
