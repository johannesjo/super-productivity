import { SimpleCounter, SimpleCounterType } from './simple-counter.model';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { PomodoroActionTypes } from '../pomodoro/store/pomodoro.actions';
import { TaskActionTypes } from '../tasks/store/task.actions';

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
    id: 'COFFEE COUNTER',
    title: 'Coffee Counter',
    type: SimpleCounterType.ClickCounter,
    icon: 'free_breakfast',
  },
];

export const SIMPLE_COUNTER_TRIGGER_ACTIONS: string[] = [
  loadAllData.type,
  TaskActionTypes.SetCurrentTask,
  TaskActionTypes.UnsetCurrentTask,
  PomodoroActionTypes.StartPomodoro,
  PomodoroActionTypes.PausePomodoro,
  PomodoroActionTypes.StopPomodoro,
  PomodoroActionTypes.FinishPomodoroSession,

  // TaskActionTypes.
];
