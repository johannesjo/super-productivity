import { SimpleCounter, SimpleCounterType } from './simple-counter.model';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import {
  finishPomodoroSession,
  pausePomodoro,
  pausePomodoroBreak,
  startPomodoro,
  startPomodoroBreak,
  stopPomodoro,
} from '../pomodoro/store/pomodoro.actions';
import { setCurrentTask, unsetCurrentTask } from '../tasks/store/task.actions';

export const EMPTY_SIMPLE_COUNTER: SimpleCounter = {
  id: '',

  // basic cfg
  title: '',
  isEnabled: false,
  icon: null,
  iconOn: undefined,
  type: SimpleCounterType.ClickCounter,

  // adv cfg
  triggerOnActions: [],
  triggerOffActions: [],

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
    id: 'COFFEE_COUNTER',
    title: 'Coffee Counter',
    type: SimpleCounterType.ClickCounter,
    icon: 'free_breakfast',
  },
  {
    ...EMPTY_SIMPLE_COUNTER,
    id: 'STRETCHING_COUNTER',
    title: 'Stretching Counter',
    type: SimpleCounterType.RepeatedCountdownReminder,
    icon: 'fitness_center',
    countdownDuration: 30 * 60 * 1000,
  },
];

export const SIMPLE_COUNTER_TRIGGER_ACTIONS: string[] = [
  loadAllData.type,
  setCurrentTask.type,
  unsetCurrentTask.type,
  startPomodoro.type,
  pausePomodoro.type,
  pausePomodoroBreak.type,
  startPomodoroBreak.type,
  stopPomodoro.type,
  finishPomodoroSession.type,
];
