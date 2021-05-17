import { animate, query, style, transition, trigger } from '@angular/animations';
import {
  ANI_ENTER_TIMING,
  ANI_LEAVE_TIMING,
} from '../../../ui/animations/animation.const';

export const bannerAnimation = [
  trigger('banner', [
    transition(':enter', [
      style({ height: 0, overflow: 'hidden' }),
      query('.inner-content-wrapper', style({ opacity: 0 })),
      animate(ANI_ENTER_TIMING, style({ height: '*' })),
      query('.inner-content-wrapper', animate(ANI_ENTER_TIMING, style({ opacity: 1 }))),
    ]), // void => *
    transition(':leave', [
      style({ overflow: 'hidden', opacity: 1 }),
      query('.inner-content-wrapper', style({ opacity: 1 })),
      query('.inner-content-wrapper', animate(ANI_LEAVE_TIMING, style({ opacity: 0 }))),
      animate(ANI_LEAVE_TIMING, style({ height: 0 })),
    ]),
  ]),
];
