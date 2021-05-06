import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_STANDARD_TIMING } from './animation.const';

export const dynamicHeightAnimation = [
  trigger('dynamicHeight', [
    transition('void <=> *', []),
    transition(
      '* <=> *',
      [style({ height: '{{startHeight}}px', opacity: 0 }), animate(ANI_STANDARD_TIMING)],
      { params: { startHeight: 0 } },
    ),
  ]),
];
