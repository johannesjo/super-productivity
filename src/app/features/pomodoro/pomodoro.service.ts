import { inject, Injectable } from '@angular/core';

import { combineLatest, interval, merge, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  scan,
  shareReplay,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

import { Actions, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';

import { DEFAULT_GLOBAL_CONFIG } from '../config/default-global-config.const';
import { PomodoroConfig, SoundConfig } from '../config/global-config.model';
import { GlobalConfigService } from '../config/global-config.service';
import { TaskService } from '../tasks/task.service';
import {
  finishPomodoroSession,
  pausePomodoro,
  pausePomodoroBreak,
  skipPomodoroBreak,
  startPomodoro,
  startPomodoroBreak,
  stopPomodoro,
} from './store/pomodoro.actions';
import {
  selectCurrentCycle,
  selectIsBreak,
  selectIsManualPause,
  selectIsManualPauseBreak,
} from './store/pomodoro.reducer';

const TICK_DURATION = 500;
const DEFAULT_SOUND = 'assets/snd/positive.ogg';
const DEFAULT_TICK_SOUND = 'assets/snd/tick.mp3';

@Injectable({
  providedIn: 'root',
})
export class PomodoroService {
  private _configService = inject(GlobalConfigService);
  private _store$ = inject<Store<any>>(Store);
  private _actions$ = inject(Actions);
  private readonly _taskService = inject(TaskService);

  onStop$: Observable<any> = this._actions$.pipe(ofType(stopPomodoro));

  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(
    map((cfg) => cfg && cfg.pomodoro),
    distinctUntilChanged(),
  );
  soundConfig$: Observable<SoundConfig> = this._configService.cfg$.pipe(
    map((cfg) => cfg && cfg.sound),
  );
  isEnabled$: Observable<boolean> = this.cfg$.pipe(
    map((cfg) => cfg && !!cfg.isEnabled),
    shareReplay(1),
  );

  isManualPauseWork$: Observable<boolean> = this._store$.pipe(
    select(selectIsManualPause),
  );
  isManualPauseBreak$: Observable<boolean> = this._store$.pipe(
    select(selectIsManualPauseBreak),
  );
  isBreak$: Observable<boolean> = this._store$.pipe(select(selectIsBreak));
  currentCycle$: Observable<number> = this._store$.pipe(select(selectCurrentCycle));

  isLongBreak$: Observable<boolean> = combineLatest([
    this.isBreak$,
    this.currentCycle$,
    this.cfg$,
  ]).pipe(
    map(([isBreak, currentCycle, cfg]) => {
      return (
        isBreak &&
        !!cfg.cyclesBeforeLongerBreak &&
        Number.isInteger((currentCycle + 1) / cfg.cyclesBeforeLongerBreak)
      );
    }),
  );

  isShortBreak$: Observable<boolean> = combineLatest([
    this.isBreak$,
    this.isLongBreak$,
  ]).pipe(map(([isBreak, isLongBreak]) => isBreak && !isLongBreak));

  _timer$: Observable<number> = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  tick$: Observable<number> = this._timer$.pipe(
    withLatestFrom(
      this.isManualPauseWork$,
      this.isManualPauseBreak$,
      this.isBreak$,
      this.isEnabled$,
    ),
    filter(
      ([v, isManualPause, isManualPauseBreak, isBreak, isEnabled]) =>
        !isManualPause && (!isBreak || !isManualPauseBreak) && isEnabled,
    ),
    map(([tick]) => tick * -1),
  );

  // isManualPause$
  nextSession$: Observable<number> = merge(
    this.isBreak$,
    // NOTE: not needed, since already included .pipe(distinctUntilChanged(distinctUntilChangedObject))
    this.cfg$,
    this.onStop$,
  ).pipe(
    withLatestFrom(this.isLongBreak$, this.isShortBreak$, this.isBreak$, this.cfg$),
    map(([trigger, isLong, isShort, isBreak, cfg]): number => {
      if (!isBreak) {
        return (cfg.duration ?? DEFAULT_GLOBAL_CONFIG.pomodoro.duration) as number;
      } else if (isShort) {
        return (cfg.breakDuration ??
          DEFAULT_GLOBAL_CONFIG.pomodoro.breakDuration) as number;
      } else if (isLong) {
        return (cfg.longerBreakDuration ??
          DEFAULT_GLOBAL_CONFIG.pomodoro.longerBreakDuration) as number;
      } else {
        throw new Error('Pomodoro: nextSession$');
      }
    }),
    shareReplay(1),
  );

  currentSessionTime$: Observable<number> = merge(this.tick$, this.nextSession$).pipe(
    scan((acc, value) => {
      return value < 0 ? acc + value : value;
    }),
    shareReplay(1),
  );

  // 0 to 1
  sessionProgress$: Observable<number> = this.currentSessionTime$.pipe(
    withLatestFrom(this.nextSession$),
    map(([currentTime, initialTime]) => {
      return (initialTime - currentTime) / initialTime;
    }),
  );

  constructor() {
    // NOTE: idle handling is not required, as unsetting the task auto triggers pause
    this.currentSessionTime$
      .pipe(
        filter((val) => val <= 0),
        withLatestFrom(this.cfg$, this.isBreak$),
      )
      .subscribe(([val, cfg, isBreak]) => {
        if (cfg.isManualContinueBreak && !isBreak) {
          this.pauseBreak(true);

          if (cfg.isDisableAutoStartAfterBreak) {
            this._taskService.pauseCurrent();
          }
        } else if (cfg.isManualContinue && isBreak) {
          this.pause(true);

          if (cfg.isDisableAutoStartAfterBreak) {
            this._taskService.pauseCurrent();
          }
        } else {
          this.finishPomodoroSession();
        }
      });

    this.currentSessionTime$
      .pipe(
        withLatestFrom(this.cfg$),
        filter(([val, cfg]) => !!cfg.isEnabled && !!cfg.isPlayTick),
        map(([val]) => val),
        distinctUntilChanged(),
        filter((v, index) => index % (1000 / TICK_DURATION) === 0),
        withLatestFrom(this.soundConfig$),
      )
      .subscribe(([val, soundConfig]) => {
        this._playTickSound(soundConfig.volume);
      });
  }

  start(): void {
    this._store$.dispatch(startPomodoro());
  }

  pause(isBreakEndPause: boolean = false): void {
    this._store$.dispatch(pausePomodoro({ isBreakEndPause }));
  }

  pauseBreak(isBreakStartPause: boolean = false): void {
    this._store$.dispatch(pausePomodoroBreak({ isBreakStartPause }));
  }

  startBreak(isBreakStart: boolean = false): void {
    this._store$.dispatch(startPomodoroBreak({ isBreakStart }));
  }

  stop(): void {
    this._store$.dispatch(stopPomodoro());
  }

  finishPomodoroSession(): void {
    this._store$.dispatch(finishPomodoroSession());
  }

  skipBreak(): void {
    this._store$.dispatch(skipPomodoroBreak());
  }

  // NON STORE ACTIONS
  playSessionDoneSound(): void {
    new Audio(DEFAULT_SOUND).play();
  }

  private _playTickSound(volume: number): void {
    const tickAudio = new Audio(DEFAULT_TICK_SOUND);
    tickAudio.volume = volume / 100;
    tickAudio.play();
  }
}
