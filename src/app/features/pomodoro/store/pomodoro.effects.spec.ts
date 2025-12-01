import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, EMPTY, Observable, of } from 'rxjs';

import { PomodoroEffects } from './pomodoro.effects';
import { provideMockStore } from '@ngrx/store/testing';
import { NotifyService } from '../../../core/notify/notify.service';
import { MatDialog } from '@angular/material/dialog';
import { SnackService } from '../../../core/snack/snack.service';
import { PomodoroService } from '../pomodoro.service';
import { setCurrentTask, unsetCurrentTask } from '../../tasks/store/task.actions';
import { PomodoroConfig } from '../../config/global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { Action } from '@ngrx/store';
import { finishPomodoroSession, pausePomodoro, startPomodoro } from './pomodoro.actions';
import { TaskService } from '../../tasks/task.service';
import { TaskCopy } from '../../tasks/task.model';

describe('PomodoroEffects', () => {
  let actions$: Observable<any>;
  let effects: PomodoroEffects;
  let cfg$: BehaviorSubject<PomodoroConfig>;
  let currentSessionTime$: BehaviorSubject<number>;
  let isBreak$: BehaviorSubject<boolean>;
  let isEnabled$: BehaviorSubject<boolean>;
  let allStartableTasks$: BehaviorSubject<Partial<TaskCopy>[]>;

  beforeEach(() => {
    cfg$ = new BehaviorSubject<PomodoroConfig>({
      ...DEFAULT_GLOBAL_CONFIG.pomodoro,
      isEnabled: true,
    });
    isEnabled$ = new BehaviorSubject<boolean>(true);
    currentSessionTime$ = new BehaviorSubject<number>(5000);
    isBreak$ = new BehaviorSubject<boolean>(false);
    allStartableTasks$ = new BehaviorSubject<any[]>([]);
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
        {
          provide: TaskService,
          useValue: {
            allStartableTasks$,
          },
        },
        { provide: MatDialog, useValue: {} },
        { provide: NotifyService, useValue: {} },
        { provide: SnackService, useValue: { open: () => undefined } },
      ],
    });
    effects = TestBed.inject(PomodoroEffects);
  });

  it('should start pomodoro when a task is set to current', (done) => {
    actions$ = of(setCurrentTask({ id: 'something' }));
    allStartableTasks$.next([{ id: 'h' }]);
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      expect(effectAction.type).toBe(startPomodoro.type);
      done();
    });
  });

  it('should pause pomodoro when a task is set none', (done) => {
    actions$ = of(unsetCurrentTask());
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      expect(effectAction.type).toBe(pausePomodoro.type);
      done();
    });
  });

  it('should start pomodoro if starting a task on break', (done) => {
    isBreak$.next(true);
    currentSessionTime$.next(0);
    allStartableTasks$.next([{ id: 'h' }]);
    actions$ = of(setCurrentTask({ id: 'something' }));

    const as: Action[] = [];
    effects.playPauseOnCurrentUpdate$.subscribe((effectAction) => {
      as.push(effectAction);
      if (as.length === 2) {
        expect(as.map((a) => a.type)).toEqual([
          finishPomodoroSession.type,
          startPomodoro.type,
        ]);
        done();
      }
    });
  });
});
