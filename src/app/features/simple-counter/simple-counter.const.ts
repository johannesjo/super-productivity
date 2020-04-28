import {SimpleCounter} from './simple-counter.model';

export const EMPTY_SIMPLE_COUNTER: SimpleCounter = {
  id: undefined,

  // basic cfg
  title: undefined,
  isEnabled: false,
  iconPlay: undefined,
  iconPause: undefined,

  // adv cfg
  isStartWhenTrackingTime: false,
  isPauseWhenTimeTrackingIsPaused: false,

  // dynamic
  time: 0,
  totalTimeOnDay: {},
  isRunning: false,
};

export const DEFAULT_SIMPLE_COUNTERS: SimpleCounter[] = [
  {
    ...EMPTY_SIMPLE_COUNTER,
    id: 'STANDING_DESK_ID',
    title: 'Standing Desk Timer',
    iconPause: 'airline_seat_recline_normal',
    iconPlay: 'emoji_people',
  }
];
