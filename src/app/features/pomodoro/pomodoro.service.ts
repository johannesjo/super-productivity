import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { map } from 'rxjs/operators';
import { PomodoroConfig } from '../config/config.model';
import { DEFAULT_CFG } from '../config/default-config.const';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';

@Injectable()
export class PomodoroService {
  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(map(cfg => cfg && cfg.pomodoro));
  duration$ = this.cfg$.pipe(map(cfg => cfg.duration));

  // currentSessionStartTime$: Observable<number> = this.currentCycle$.pipe();
  currentSessionTime$: Observable<number> = new BehaviorSubject(DEFAULT_CFG.pomodoro.duration);
  sessionProgress$: Observable<number>;

  isManualPause$: Observable<boolean>;
  isPomodoroBreak$: Observable<boolean>;
  currentCycle$: Observable<number>;
  isOnLongBreak: Observable<boolean>;
  isOnShortBreak: Observable<boolean>;

  constructor(
    private _configService: ConfigService,
    private _timeTrackingService: TimeTrackingService,
  ) {
    // this.cfg$.subscribe(val => console.log(val));
  }

  skipBreak() {
  }

  sendUpdateToRemoteInterface() {
  }
}
