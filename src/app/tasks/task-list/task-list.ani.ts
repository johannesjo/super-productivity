import { animate, keyframes, query, stagger, style, transition, trigger } from '@angular/animations';
import { ANI_ENTER_TIMING, ANI_LEAVE_TIMING } from '../../ui/animations/animation.const';

export const taskListAnimation = trigger('taskListAnimation', [
  transition('* => *', [
    query(':enter', style({opacity: 0, height: 0}), {optional: true}),

    query(':enter', stagger(ANI_ENTER_TIMING, [
      animate(ANI_ENTER_TIMING, keyframes([
        style({opacity: 0, height: 0, transform: 'scaleY(0)', zIndex: 4, offset: 0.4}),
        style({opacity: 1, height: '*', transform: 'scaleY(1)', zIndex: 4, offset: 1.0}),
      ]))]), {optional: true}
    ),

    query(
      ':leave', [
        style({transform: 'scaleY(1)', opacity: 1, height: '*'}),
        animate(ANI_LEAVE_TIMING, style({transform: 'scaleY(0)', height: 0}))
      ],
      {optional: true},
    ),
    query('.gu-transit', style({
        display: 'none',
        opacity: 0,
        height: 0,
        visibility: 'hidden'
      }),
      {optional: true}
    ),
  ]),
  transition('* => BLOCK', []),
  transition('BLOCK => *', [])
]);
