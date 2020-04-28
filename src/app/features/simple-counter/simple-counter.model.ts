export interface SimpleCounter {
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

export type SimpleCounterConfig = Readonly<{
  counters: SimpleCounter[];
}>;
