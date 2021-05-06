import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, EMPTY, Observable, of } from 'rxjs';

import { PomodoroEffects } from './pomodoro.effects';
import { provideMockStore } from '@ngrx/store/testing';
import { NotifyService } from '../../../core/notify/notify.service';
import { MatDialog } from '@angular/material/dialog';
import { ElectronService } from '../../../core/electron/electron.service';
import { SnackService } from '../../../core/snack/snack.service';
import { PomodoroService } from '../pomodoro.service';
import { SetCurrentTask } from '../../tasks/store/task.actions';
import { PomodoroConfig } from '../../config/global-config.model';
import { PomodoroActionTypes } from './pomodoro.actions';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { Action } from '@ngrx/store';

describe('PomodoroEffects', () => {
  let actions$: Observable<any>;
  let effects: PomodoroEffects;
  let cfg$: BehaviorSubject<PomodoroConfig>;
  let currentSessionTime$: BehaviorSubject<number>;
  let isBreak$: BehaviorSubject<boolean>;
  let isEnabled$: BehaviorSubject<boolean>;

  beforeEach(() => {
    cfg$ = new BehaviorSubject<PomodoroConfig>({
      ...DEFAULT_GLOBAL_CONFIG.pomodoro,
      isEnabled: true,
    });
    isEnabled$ = new BehaviorSubject<boolean>(true);
    currentSessionTime$ = new BehaviorSubject<number>(5000);
    isBreak$ = new BehaviorSubject<boolean>(false);

    TestBed.configureTestingModule({
      providers: [
        PomodoroEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        {
          provide: PomodoroService,
          useValue: {
            sessionProgress$: EMPTY,
            cfg$,
            isBreak$,
            currentSessionTime$,
            isEnabled$,
          },
        },
        { provide: MatDialog, useValue: {} },
        { provide: NotifyService, useValue: {} },
        { provide: ElectronService, useValue: {} },
        { provide: SnackService, useValue: {} },
      ],
    });
    effects = TestBed.inject(PomodoroEffects);
  });

  it('should start pomodoro when a task is set to current', (done) => {
    actions$ = of(new SetCurrentTask('something'));
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      expect(effectAction.type).toBe(PomodoroActionTypes.StartPomodoro);
      done();
    });
  });

  it('should pause pomodoro when a task is set none', (done) => {
    actions$ = of(new SetCurrentTask(null));
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      expect(effectAction.type).toBe(PomodoroActionTypes.PausePomodoro);
      done();
    });
  });

  it('should start pomodoro if starting a task on break', (done) => {
    isBreak$.next(true);
    currentSessionTime$.next(0);
    actions$ = of(new SetCurrentTask('something'));

    const as: Action[] = [];
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      as.push(effectAction);
      if (as.length === 2) {
        expect(as.map((a) => a.type)).toEqual([
          PomodoroActionTypes.FinishPomodoroSession,
          PomodoroActionTypes.StartPomodoro,
        ]);
        done();
      }
    });
  });
});
