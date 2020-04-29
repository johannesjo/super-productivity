import {EntityState} from '@ngrx/entity';

export enum SimpleCounterType {
  StopWatch = 'StopWatch',
  ClickCounter = 'ClickCounter',
}


export interface SimpleCounterCfgFields {
  id: string;

  // basic cfg
  title: string;
  isEnabled: boolean;
  icon: string;
  iconOn?: string;
  type: SimpleCounterType;

  // adv cfg
  isStartWhenTrackingTime: boolean;
  isPauseWhenTimeTrackingIsPaused: boolean;
}

export interface SimpleCounterCopy extends SimpleCounterCfgFields {
  // dynamic
  count: number;
  totalCountOnDay: { [key: string]: number };
  isRunning: boolean;
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
}
