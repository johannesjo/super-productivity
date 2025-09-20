import { animate, style, transition, trigger } from '@angular/animations';
import { TREE_CONSTANTS } from './tree-constants';

export const expandCollapseAni = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: '0px', overflow: 'hidden' }),
    animate(
      `${TREE_CONSTANTS.ANIMATION_DURATION}ms ease-in-out`,
      style({ height: '*', overflow: 'visible' }),
    ),
  ]),
  transition(':leave', [
    style({ height: '*', overflow: 'visible' }),
    animate(
      `${TREE_CONSTANTS.ANIMATION_DURATION}ms ease-in-out`,
      style({ height: '0px', overflow: 'hidden' }),
    ),
  ]),
]);
