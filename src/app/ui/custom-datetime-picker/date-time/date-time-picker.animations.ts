/**
 * date-time-picker.animations
 */
import {
  animate,
  animateChild,
  AnimationTriggerMetadata,
  group,
  query,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

const TRANSITION_DURATION_M = '225ms';
const ANI_ENTER_TIMING_ = 'cubic-bezier(0, 0, .2, 1)';
const ANI_LEAVE_TIMING_ = 'cubic-bezier(.4, 0, 1, 1)';
const TRANSITION_DURATION_ENTER = TRANSITION_DURATION_M;
const TRANSITION_DURATION_LEAVE = '195ms';
const ANI_ENTER_TIMING = `${TRANSITION_DURATION_ENTER} ${ANI_ENTER_TIMING_}`;
const ANI_LEAVE_TIMING = `${TRANSITION_DURATION_LEAVE} ${ANI_LEAVE_TIMING_}`;

export const owlDateTimePickerAnimations: {
  readonly transformPicker: AnimationTriggerMetadata;
  readonly fadeInPicker: AnimationTriggerMetadata;
  readonly fade: AnimationTriggerMetadata;
} = {
  transformPicker: trigger('transformPicker', [
    state('void', style({ opacity: 0, transform: 'scale(1, 0)' })),
    state('enter', style({ opacity: 1, transform: 'scale(1, 1)' })),
    transition(
      'void => enter',
      group([
        query('@fadeInPicker', animateChild(), { optional: true }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)'),
      ]),
    ),
    transition('enter => void', animate('100ms linear', style({ opacity: 0 }))),
  ]),

  fadeInPicker: trigger('fadeInPicker', [
    state('enter', style({ opacity: 1 })),
    state('void', style({ opacity: 0 })),
    transition('void => enter', animate('400ms 100ms cubic-bezier(0.55, 0, 0.55, 0.2)')),
  ]),

  fade: trigger('fade', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate(ANI_ENTER_TIMING, style({ opacity: '*' })),
    ]), // void => *
    transition(':leave', [
      style({ opacity: '*' }),
      animate(ANI_LEAVE_TIMING, style({ opacity: 0 })),
    ]),
  ]),
};
