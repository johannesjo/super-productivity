import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from './animation.const';

export const slideInFromLeftAni = [
  trigger('slideInFromLeft', [
    transition(':enter', [
      style({ transform: 'translateX(-100%)' }),
      animate(ANI_ENTER_TIMING, style({ transform: 'translateX(0)' })),
    ]),

    // transition(':leave', [
    //   style({ transform: 'translateX(0)' }),
    //   animate(ANI_ENTER_TIMING, style({ transform: 'translateX(-100%)' })),
    // ]),
  ]),
];
