import { Injectable } from '@angular/core';
import { combineLatest, merge, Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { filter, map, mapTo, scan, shareReplay, withLatestFrom } from 'rxjs/operators';
import { PomodoroConfig } from '../config/config.model';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { select, Store } from '@ngrx/store';
import { FinishPomodoroSession, PausePomodoro, StartPomodoro, StopPomodoro } from './store/pomodoro.actions';
import { selectCurrentCycle, selectIsBreak, selectIsManualPause } from './store/pomodoro.reducer';

// Tick Duration
const TD = -1000;

@Injectable()
export class PomodoroService {
  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(map(cfg => cfg && cfg.pomodoro));

  // TODO use this somehow
  isEnabled$: Observable<boolean> = this.cfg$.pipe(map(cfg => cfg && cfg.isEnabled));

  isManualPause$: Observable<boolean> = this._store$.pipe(select(selectIsManualPause));
  isBreak$: Observable<boolean> = this._store$.pipe(select(selectIsBreak));
  currentCycle$: Observable<number> = this._store$.pipe(select(selectCurrentCycle));

  isLongBreak$: Observable<boolean> = combineLatest(
    this.isBreak$,
    this.currentCycle$,
    this.cfg$,
  ).pipe(map(([isBreak, currentCycle, cfg]) => {
    return isBreak && cfg.cyclesBeforeLongerBreak && Number.isInteger((cfg.cyclesBeforeLongerBreak / currentCycle));
  }));

  isShortBreak$: Observable<boolean> = combineLatest(
    this.isBreak$,
    this.isLongBreak$,
  ).pipe(map(([isBreak, isLongBreak]) => isBreak && !isLongBreak));

  startTimer$ = this._timeTrackingService.globalInterval$;
  tick$ = this.startTimer$.pipe(
    withLatestFrom(this.isManualPause$),
    filter(([v, isManualPause]) => !isManualPause),
    mapTo(TD),
  );

  nextSession$: Observable<number> = this.isBreak$.pipe(
    withLatestFrom(
      this.isLongBreak$,
      this.isShortBreak$,
      this.cfg$
    ),
    map(([isBreak, isLong, isShort, cfg]) => {
      return isBreak ? (isLong ? 20000 : 5000) : 10000;
      // if (!isBreak) {
      // return cfg.duration || DEFAULT_CFG.pomodoro.duration;
      // } else if (isShort) {
      //   return cfg.longerBreakDuration || DEFAULT_CFG.pomodoro.breakDuration;
      // } else if (isLong) {
      // return cfg.longerBreakDuration || DEFAULT_CFG.pomodoro.longerBreakDuration;
      // }
    }),
    shareReplay(),
  );

  currentSessionTime$: Observable<any> = merge(
    this.tick$,
    this.nextSession$
  ).pipe(
    scan((acc, value) => {
      return (value === TD)
        ? acc + value
        : value;
    }),
  );

  sessionProgress$: Observable<number> = this.currentSessionTime$.pipe(
    withLatestFrom(this.nextSession$),
    map(([currentTime, initialTime]) => {
      return (initialTime - currentTime) / initialTime * 100;
    })
  );


  constructor(
    private _configService: ConfigService,
    private _store$: Store<any>,
    private _timeTrackingService: TimeTrackingService,
  ) {
    this.currentSessionTime$
      .pipe(withLatestFrom(this.cfg$))
      .subscribe(([val, cfg]) => {
        // TODO manual continue
        if (val === 0) {
          this.finishPomodoroSession();
        }
      });

    this.isBreak$.subscribe(val => console.log(val));
    this.sessionProgress$.subscribe(val => console.log(val));
  }

  skipBreak() {
  }


  startPomodoro() {
    this._store$.dispatch(new StartPomodoro());
  }

  pausePomodoro() {
    this._store$.dispatch(new PausePomodoro());
  }

  stopPomodoro() {
    this._store$.dispatch(new StopPomodoro());
  }

  finishPomodoroSession() {
    this._store$.dispatch(new FinishPomodoroSession());
  }

  private sendUpdateToRemoteInterface() {
  }
}
