import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from '../../ui/animations/animation.const';

export const slideRightPanelAni = [
  trigger('slideRightPanel', [
    transition(':enter', [
      style({ width: '0' }),
      animate(ANI_ENTER_TIMING, style({ width: '*' })),
    ]),
    transition(':leave', [
      style({ width: '*' }),
      animate(ANI_LEAVE_TIMING, style({ width: '0' })),
    ]),

    // transition(':leave', [
    //   style({ transform: 'translateX(0)' }),
    //   animate(ANI_ENTER_TIMING, style({ transform: 'translateX(-100%)' })),
    // ]),
  ]),
];
