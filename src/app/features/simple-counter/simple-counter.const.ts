import {SimpleCounter, SimpleCounterType} from './simple-counter.model';

export const EMPTY_SIMPLE_COUNTER: SimpleCounter = {
  id: undefined,

  // basic cfg
  title: undefined,
  isEnabled: false,
  icon: undefined,
  iconOn: undefined,
  type: SimpleCounterType.ClickCounter,

  // adv cfg
  isStartWhenTrackingTime: false,
  isPauseWhenTimeTrackingIsPaused: false,

  // dynamic
  countOnDay: {},
  isOn: false,
};

export const DEFAULT_SIMPLE_COUNTERS: SimpleCounter[] = [
  {
    ...EMPTY_SIMPLE_COUNTER,
    id: 'STANDING_DESK_ID',
    title: 'Standing Desk Timer',
    type: SimpleCounterType.StopWatch,
    icon: 'airline_seat_recline_normal',
    iconOn: 'directions_walk',
  },
  {
    ...EMPTY_SIMPLE_COUNTER,
    id: 'COFFEE COUNTER',
    title: 'Standing Desk Timer',
    type: SimpleCounterType.ClickCounter,
    icon: 'free_breakfast',
  }
];
