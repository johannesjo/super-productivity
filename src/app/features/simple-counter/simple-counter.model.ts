import { EntityState } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';

export enum SimpleCounterType {
  StopWatch = 'StopWatch',
  ClickCounter = 'ClickCounter',
  RepeatedCountdownReminder = 'RepeatedCountdownReminder',
}

export interface SimpleCounterCfgFields {
  id: string;

  // basic cfg
  title: string;
  isEnabled: boolean;
  icon: string | null;
  iconOn?: string;
  type: SimpleCounterType;

  // adv cfg
  triggerOnActions: string[];
  triggerOffActions?: string[];

  // repeated countdown reminder
  countdownDuration?: number;
}

export interface SimpleCounterCopy extends SimpleCounterCfgFields {
  // dynamic
  countOnDay: { [key: string]: number };
  isOn: boolean;
}

export type SimpleCounter = Readonly<SimpleCounterCopy>;

// just an empty dummy actually
// todo remove
export type SimpleCounterConfig = Readonly<{
  counters: SimpleCounter[];
}>;

export interface SimpleCounterState extends EntityState<SimpleCounter> {
  ids: string[];
  // additional entities state properties
  [MODEL_VERSION_KEY]?: number;
}
