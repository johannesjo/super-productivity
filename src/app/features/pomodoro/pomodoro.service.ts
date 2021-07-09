import { Injectable } from '@angular/core';
import { combineLatest, interval, merge, Observable, of } from 'rxjs';
import { GlobalConfigService } from '../config/global-config.service';
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
import { PomodoroConfig, SoundConfig } from '../config/global-config.model';
import { select, Store } from '@ngrx/store';
import {
  FinishPomodoroSession,
  PausePomodoro,
  PomodoroActionTypes,
  SkipPomodoroBreak,
  StartPomodoro,
  StopPomodoro,
} from './store/pomodoro.actions';
import {
  selectCurrentCycle,
  selectIsBreak,
  selectIsManualPause,
} from './store/pomodoro.reducer';
import { DEFAULT_GLOBAL_CONFIG } from '../config/default-global-config.const';
import { Actions, ofType } from '@ngrx/effects';
import { distinctUntilChangedObject } from '../../util/distinct-until-changed-object';

const TICK_DURATION = 500;
const DEFAULT_SOUND = 'assets/snd/positive.ogg';
const DEFAULT_TICK_SOUND = 'assets/snd/tick.mp3';

@Injectable({
  providedIn: 'root',
})
export class PomodoroService {
  onStop$: Observable<any> = this._actions$.pipe(
    ofType(PomodoroActionTypes.StopPomodoro),
  );

  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(
    map((cfg) => cfg && cfg.pomodoro),
  );
  soundConfig$: Observable<SoundConfig> = this._configService.cfg$.pipe(
    map((cfg) => cfg && cfg.sound),
  );
  isEnabled$: Observable<boolean> = this.cfg$.pipe(
    map((cfg) => cfg && cfg.isEnabled),
    shareReplay(1),
  );

  isManualPause$: Observable<boolean> = this._store$.pipe(select(selectIsManualPause));
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
    withLatestFrom(this.isManualPause$, this.isEnabled$),
    filter(([v, isManualPause, isEnabled]) => !isManualPause && isEnabled),
    map(([tick]) => tick * -1),
  );

  // isManualPause$
  nextSession$: Observable<number> = merge(
    this.isBreak$,
    this.cfg$.pipe(distinctUntilChanged(distinctUntilChangedObject)),
    this.onStop$,
  ).pipe(
    withLatestFrom(this.isLongBreak$, this.isShortBreak$, this.isBreak$, this.cfg$),
    map(([trigger, isLong, isShort, isBreak, cfg]) => {
      // cfg = { ...cfg };
      // // @ts-ignore
      // cfg.duration = 5000;
      // // @ts-ignore
      // cfg.breakDuration = 15000;
      // // @ts-ignore
      // cfg.longerBreakDuration = 20000;
      if (!isBreak) {
        return cfg.duration || DEFAULT_GLOBAL_CONFIG.pomodoro.duration;
      } else if (isShort) {
        return cfg.breakDuration || DEFAULT_GLOBAL_CONFIG.pomodoro.breakDuration;
      } else if (isLong) {
        return (
          cfg.longerBreakDuration || DEFAULT_GLOBAL_CONFIG.pomodoro.longerBreakDuration
        );
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

  constructor(
    private _configService: GlobalConfigService,
    private _store$: Store<any>,
    private _actions$: Actions,
  ) {
    // NOTE: idle handling is not required, as unsetting the task auto triggers pause
    this.currentSessionTime$
      .pipe(
        filter((val) => val <= 0),
        withLatestFrom(this.cfg$, this.isBreak$),
      )
      .subscribe(([val, cfg, isBreak]) => {
        if (cfg.isManualContinue && isBreak) {
          this.pause(true);
        } else {
          this.finishPomodoroSession();
        }
      });

    this.currentSessionTime$
      .pipe(
        withLatestFrom(this.cfg$),
        filter(([val, cfg]) => cfg.isEnabled && cfg.isPlayTick),
        map(([val]) => val),
        distinctUntilChanged(),
        filter((v, index) => index % (1000 / TICK_DURATION) === 0),
        withLatestFrom(this.soundConfig$),
      )
      .subscribe(([val, soundConfig]) => {
        this._playTickSound(soundConfig.volume);
      });
  }

  start() {
    this._store$.dispatch(new StartPomodoro());
  }

  pause(isBreakEndPause: boolean = false) {
    this._store$.dispatch(new PausePomodoro({ isBreakEndPause }));
  }

  stop() {
    this._store$.dispatch(new StopPomodoro());
  }

  finishPomodoroSession() {
    this._store$.dispatch(new FinishPomodoroSession());
  }

  skipBreak() {
    this._store$.dispatch(new SkipPomodoroBreak());
  }

  // NON STORE ACTIONS
  playSessionDoneSound() {
    new Audio(DEFAULT_SOUND).play();
  }

  private _playTickSound(volume: number) {
    const tickAudio = new Audio(DEFAULT_TICK_SOUND);
    tickAudio.volume = volume / 100;
    tickAudio.play();
  }
}
