import { EntityState } from '@ngrx/entity';

export interface SimpleCounterCopy {
  id: string;

  // basic cfg
  title: string;
  isEnabled: boolean;
  iconPlay: string;
  iconPause: string;

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
