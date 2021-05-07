import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_STANDARD_TIMING } from './animation.const';

export const blendInOutAnimation = [
  trigger('blendInOut', [
    transition(':enter', [
      style({
        opacity: 0,
        transform: 'scaleY(0)',
      }),
      animate(
        ANI_STANDARD_TIMING,
        style({
          opacity: 1,
          transform: 'scaleY(1)',
        }),
      ),
    ]), // void => *
    transition(':leave', [
      style({
        opacity: 1,
        transform: 'scaleY(1)',
      }),
      animate(
        ANI_STANDARD_TIMING,
        style({
          opacity: 0,
          transform: 'scaleY(0)',
        }),
      ),
    ]),
  ]),
];
