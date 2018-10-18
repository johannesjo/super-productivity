import { animate, state, style, transition, trigger } from '@angular/animations';

const EXPANSION_PANEL_ANIMATION_TIMING = '225ms cubic-bezier(0.4,0.0,0.2,1)';

export const expandAnimationSimple = [
  trigger('expand', [
    state('0', style({height: '0px', visibility: 'hidden'})),
    state('1', style({height: '*', visibility: 'visible'})),
    transition('0 <=> 1', animate(EXPANSION_PANEL_ANIMATION_TIMING)),
  ])
];

export const expandAnimation = [
  trigger('expand', [
    transition(':enter', [
      style({height: 0}),
      animate(100, style({height: '*'}))
    ]), // void => *
    transition(':leave', [
      animate(100, style({height: 0}))
    ])
  ])
];
