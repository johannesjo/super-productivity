import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from '../../../ui/animations/animation.const';

const ANI = [
  style({ opacity: 0, transform: 'scale(0.9)' }),
  animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'scale(1)' })),
];

export const taskAdditionalInfoTaskChangeAnimation = trigger(
  'taskAdditionalInfoTaskChange',
  [transition('* <=> *', ANI), transition(':enter', [])],
);
