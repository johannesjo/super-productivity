import { transition } from '@angular/animations';
import { animate } from '@angular/animations';
import { style } from '@angular/animations';
import { trigger } from '@angular/animations';
import { state } from '@angular/animations';

const EXPANSION_PANEL_ANIMATION_TIMING = '225ms cubic-bezier(0.4,0.0,0.2,1)';

export const expandAnimation = [
  trigger('expand', [
    state('0', style({height: '0px', visibility: 'hidden'})),
    state('1', style({height: '*', visibility: 'visible'})),
    transition('0 <=> 1', animate(EXPANSION_PANEL_ANIMATION_TIMING)),
    // transition(':enter', [
    //   animate(100, style({height: '*', visibility: 'visible'}))
    // ]), // void => *
    // transition(':leave', [
    //   animate(100, style({height: 0, visibility: 'hidden'}))
    // ])
  ])
];
