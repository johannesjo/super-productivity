import { animate, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING } from '../../../ui/animations/animation.const';

const ANI = [
  style({ opacity: 0, transform: 'translateX(-100%)' }),
  animate(ANI_ENTER_TIMING, style({ opacity: 1, transform: 'translateX(0)' })),
];

export const taskDetailPanelTaskChangeAnimation = trigger('taskDetailPanelTaskChange', [
  transition('disabled => disabled', []),
  transition('* => disabled', []),
  transition('disabled => *', []),
  transition('* <=> *', ANI),
  transition(':enter', []),
]);
