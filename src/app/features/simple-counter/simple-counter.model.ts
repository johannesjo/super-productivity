import { EntityState } from '@ngrx/entity';
export enum SimpleCounterType {
  StopWatch = 'StopWatch',
  ClickCounter = 'ClickCounter',
}

export interface SimpleCounterCopy {
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

  // dynamic
  time: number;
  totalTimeOnDay: { [key: string]: number };
  isRunning: boolean;
}

export type SimpleCounter = Readonly<SimpleCounterCopy>;

export type SimpleCounterConfig = Readonly<{
  counters: SimpleCounter[];
}>;


export interface SimpleCounterState extends EntityState<SimpleCounter> {
  // additional entities state properties
}
