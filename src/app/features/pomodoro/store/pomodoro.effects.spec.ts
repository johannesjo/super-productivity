import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {BehaviorSubject, EMPTY, Observable, of} from 'rxjs';

import {PomodoroEffects} from './pomodoro.effects';
import {provideMockStore} from '@ngrx/store/testing';
import {NotifyService} from '../../../core/notify/notify.service';
import {MatDialog} from '@angular/material/dialog';
import {ElectronService} from '../../../core/electron/electron.service';
import {SnackService} from '../../../core/snack/snack.service';
import {PomodoroService} from '../pomodoro.service';
import {SetCurrentTask} from '../../tasks/store/task.actions';
import {PomodoroConfig} from '../../config/global-config.model';
import {PomodoroActionTypes} from './pomodoro.actions';

describe('PomodoroEffects', () => {
  let actions$: Observable<any>;
  let effects: PomodoroEffects;

  const cfg$ = new BehaviorSubject<PomodoroConfig>({
    isEnabled: true,
    duration: 25 * 1000,
    breakDuration: 5 * 1000,
    longerBreakDuration: 15 * 1000,
    cyclesBeforeLongerBreak: 4,
    isStopTrackingOnBreak: true,
    isStopTrackingOnLongBreak: true,
    isManualContinue: false,
    isPlaySound: true,
    isPlaySoundAfterBreak: false,
    isPlayTick: false,
  });
  const isBreak$ = new BehaviorSubject<boolean>(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PomodoroEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        {
          provide: PomodoroService, useValue: {
            sessionProgress$: EMPTY,
            cfg$,
            isBreak$,
          },
        },
        {provide: MatDialog, useValue: {}},
        {provide: NotifyService, useValue: {}},
        {provide: ElectronService, useValue: {}},
        {provide: SnackService, useValue: {}},
      ]
    });
    effects = TestBed.inject(PomodoroEffects);
  });

  it('should start pomodoro when a task is set to current', (done) => {
    actions$ = of(new SetCurrentTask('something'));
    effects.playPauseOnCurrentUpdate$.subscribe(effectAction => {
      expect(effectAction.type).toBe(PomodoroActionTypes.StartPomodoro);
      done();
    });
  });

  it('should pause pomodoro when a task is set none', (done) => {
    actions$ = of(new SetCurrentTask(null));
    effects.playPauseOnCurrentUpdate$.subscribe(effectAction => {
      expect(effectAction.type).toBe(PomodoroActionTypes.PausePomodoro);
      done();
    });
  });
});
