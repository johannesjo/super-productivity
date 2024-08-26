import { animate, style, transition, trigger } from '@angular/animations';
import {
  ANI_ENTER_TIMING,
  ANI_LEAVE_TIMING,
  ANI_VERY_LONG_TIMING,
} from './animation.const';

export const fadeAnimation = [
  trigger('fade', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate(ANI_ENTER_TIMING, style({ opacity: '*' })),
    ]), // void => *
    transition(':leave', [
      style({ opacity: '*' }),
      animate(ANI_LEAVE_TIMING, style({ opacity: 0 })),
    ]),
  ]),
];

export const fadeInOutBottomAnimation = [
  trigger('fadeInOutBottom', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(100%)' }),
      animate(ANI_ENTER_TIMING, style({ opacity: '*', transform: 'translateY(0)' })),
    ]), // void => *
    transition(':leave', [
      style({ opacity: '*', transform: 'translateY(0)' }),
      animate(ANI_LEAVE_TIMING, style({ opacity: 0, transform: 'translateY(100%)' })),
    ]),
  ]),
];

export const fadeOutAnimation = [
  trigger('fadeOut', [
    // transition(':enter', [
    // style({opacity: 0, transform: 'translateY(100%)'}),
    // animate(ANI_ENTER_TIMING, style({opacity: '*', transform: 'translateY(0)'}))
    // ]), // void => *
    transition(':leave', [
      style({ opacity: '*' }),
      animate(ANI_LEAVE_TIMING, style({ opacity: 0 })),
    ]),
  ]),
];

export const fadeInAnimation = [
  trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate(ANI_ENTER_TIMING, style({ opacity: '*' })),
    ]), // void => *
  ]),
];

export const fadeInSlowAnimation = [
  trigger('fadeInSlow', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate(ANI_VERY_LONG_TIMING, style({ opacity: '*' })),
    ]), // void => *
  ]),
];
