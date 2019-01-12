import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { ConfigService } from '../config/config.service';
import { map } from 'rxjs/operators';
import { PomodoroConfig } from '../config/config.model';
import { DEFAULT_CFG } from '../config/default-config.const';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { select, Store } from '@ngrx/store';
import { FinishPomodoroSession, PausePomodoro, StartPomodoro, StopPomodoro } from './store/pomodoro.actions';
import { TaskService } from '../tasks/task.service';
import { selectCurrentCycle, selectIsBreak, selectIsManualPause } from './store/pomodoro.reducer';

@Injectable()
export class PomodoroService {
  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(map(cfg => cfg && cfg.pomodoro));
  duration$ = this.cfg$.pipe(map(cfg => cfg && cfg.duration));

  currentSessionTime$: Observable<number> = new BehaviorSubject(DEFAULT_CFG.pomodoro.duration);
  sessionProgress$: Observable<number>;

  isManualPause$: Observable<boolean> = this._store$.pipe(select(selectIsManualPause));
  isPomodoroBreak$: Observable<boolean> = this._store$.pipe(select(selectIsBreak));
  currentCycle$: Observable<number> = this._store$.pipe(select(selectCurrentCycle));

  isOnLongBreak: Observable<boolean> = combineLatest(
    this.isPomodoroBreak$,
    this.currentCycle$,
    this.cfg$,
  ).pipe(map(([isBreak, currentCycle, cfg]) => {
    return isBreak && cfg.cyclesBeforeLongerBreak && Number.isInteger((cfg.cyclesBeforeLongerBreak / currentCycle));
  }));

  isOnShortBreak: Observable<boolean> = combineLatest(
    this.isPomodoroBreak$,
    this.isOnLongBreak,
  ).pipe(map(([isBreak, isLongBreak]) => isBreak && !isLongBreak));

  constructor(
    private _configService: ConfigService,
    private _store$: Store<any>,
    private _timeTrackingService: TimeTrackingService,
    private _taskService: TaskService,
  ) {
    // this.cfg$.subscribe(val => console.log(val));
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
