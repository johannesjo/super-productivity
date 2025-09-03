import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, take } from 'rxjs';
import { FocusModeMode } from '../../focus-mode.model';
import * as selectors from './focus-mode.selectors';
import * as actions from './focus-mode.actions';
import { focusModeReducer, initialState } from './focus-mode.reducer';
import { FocusModeEffects } from './focus-mode.effects';
import { BannerService } from '../../../core/banner/banner.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { FocusModeStrategyFactory } from '../focus-mode-strategies';

describe('FocusMode Flowtime behavior', () => {
  describe('Reducer: setFocusSessionDuration', () => {
    it('should ignore duration changes when mode is Flowtime', () => {
      const state = {
        ...initialState,
        mode: FocusModeMode.Flowtime,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 0,
          purpose: 'work' as const,
        },
      };

      const next = focusModeReducer(
        state,
        actions.setFocusSessionDuration({ focusSessionDuration: 25 * 60 * 1000 }),
      );

      expect(next.timer.duration).toBe(0);
    });

    it('should update duration for non-Flowtime modes', () => {
      const state = {
        ...initialState,
        mode: FocusModeMode.Pomodoro,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 0,
          purpose: 'work' as const,
        },
      };

      const next = focusModeReducer(
        state,
        actions.setFocusSessionDuration({ focusSessionDuration: 5_000 }),
      );

      expect(next.timer.duration).toBe(5_000);
    });
  });

  describe('Effects: detectSessionCompletion$', () => {
    let store: MockStore;
    let effects: FocusModeEffects;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideMockStore({}),
          FocusModeEffects,
          { provide: BannerService, useValue: { open: () => {}, dismiss: () => {} } },
          { provide: GlobalConfigService, useValue: { sound: () => ({ volume: 0 }) } },
          { provide: TaskService, useValue: { currentTaskId$: of(null) } },
          {
            provide: FocusModeStrategyFactory,
            useValue: {
              getStrategy: () => ({
                shouldStartBreakAfterSession: false,
                initialSessionDuration: 0,
                shouldAutoStartNextSession: false,
                getBreakDuration: () => null,
              }),
            },
          },
        ],
      });
      store = TestBed.inject(MockStore);
      effects = TestBed.inject(FocusModeEffects);
    });

    it('should NOT emit completeFocusSession for Flowtime even if elapsed >= duration', (done) => {
      const timer = {
        purpose: 'work' as const,
        isRunning: false,
        duration: 1_000,
        elapsed: 1_000,
        startedAt: 0,
      };

      store.overrideSelector(selectors.selectTimer, timer as any);
      store.overrideSelector(selectors.selectMode, FocusModeMode.Flowtime);
      store.refreshState();

      effects.detectSessionCompletion$.pipe(take(1)).subscribe({
        next: () => fail('Should not emit'),
        error: (e) => fail(String(e)),
        complete: () => done(),
      });
      // Complete immediately if no emission
      setTimeout(() => done(), 50);
    });

    it('should emit completeFocusSession for Pomodoro when elapsed >= duration', (done) => {
      const timer = {
        purpose: 'work' as const,
        isRunning: false,
        duration: 1_000,
        elapsed: 1_000,
        startedAt: 0,
      };

      store.overrideSelector(selectors.selectTimer, timer as any);
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.refreshState();

      effects.detectSessionCompletion$.pipe(take(1)).subscribe((action) => {
        expect(action.type).toBe(actions.completeFocusSession.type);
        done();
      });
    });
  });
});
