import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { FocusModeEffects } from './focus-mode.effects';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FocusModeStrategyFactory } from '../focus-mode-strategies';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { BannerService } from '../../../core/banner/banner.service';
import { MetricService } from '../../metric/metric.service';
import { FocusModeStorageService } from '../focus-mode-storage.service';
import * as actions from './focus-mode.actions';
import * as selectors from './focus-mode.selectors';
import { FocusModeMode } from '../focus-mode.model';

describe('FocusModeEffects', () => {
  let actions$: Observable<any>;
  let effects: FocusModeEffects;
  let store: MockStore;
  let strategyFactoryMock: any;

  beforeEach(() => {
    strategyFactoryMock = {
      getStrategy: jasmine.createSpy('getStrategy').and.returnValue({
        initialSessionDuration: 50 * 60 * 1000,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        FocusModeEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            focusMode: {
              timer: {
                purpose: null,
                duration: 0,
              },
              mode: FocusModeMode.Pomodoro,
            },
          },
          selectors: [
            {
              selector: selectors.selectTimer,
              value: { purpose: null, duration: 0 },
            },
            {
              selector: selectors.selectMode,
              value: FocusModeMode.Pomodoro,
            },
          ],
        }),
        {
          provide: FocusModeStrategyFactory,
          useValue: strategyFactoryMock,
        },
        { provide: GlobalConfigService, useValue: {} },
        { provide: TaskService, useValue: {} },
        { provide: BannerService, useValue: {} },
        { provide: MetricService, useValue: {} },
        { provide: FocusModeStorageService, useValue: {} },
      ],
    });

    effects = TestBed.inject(FocusModeEffects);
    store = TestBed.inject(MockStore);
  });

  it('should sync duration with mode when focusModeLoaded is dispatched', (done) => {
    actions$ = of(actions.focusModeLoaded());

    effects.syncDurationWithMode$.subscribe((action) => {
      expect(strategyFactoryMock.getStrategy).toHaveBeenCalledWith(
        FocusModeMode.Pomodoro,
      );
      expect(action).toEqual(
        actions.setFocusSessionDuration({ focusSessionDuration: 50 * 60 * 1000 }),
      );
      done();
    });
  });

  it('should sync duration with mode when setFocusModeMode is dispatched', (done) => {
    actions$ = of(actions.setFocusModeMode({ mode: FocusModeMode.Pomodoro }));

    effects.syncDurationWithMode$.subscribe((action) => {
      expect(strategyFactoryMock.getStrategy).toHaveBeenCalledWith(
        FocusModeMode.Pomodoro,
      );
      expect(action).toEqual(
        actions.setFocusSessionDuration({ focusSessionDuration: 50 * 60 * 1000 }),
      );
      done();
    });
  });

  it('should NOT sync duration on focusModeLoaded if duration is already > 0', (done) => {
    actions$ = of(actions.focusModeLoaded());
    store.overrideSelector(selectors.selectTimer, {
      purpose: null,
      duration: 25000,
    } as any);
    store.refreshState();

    const result: any[] = [];
    effects.syncDurationWithMode$.subscribe({
      next: (action) => result.push(action),
      complete: () => {
        expect(result.length).toBe(0);
        done();
      },
    });

    // Since it returns EMPTY, it completes immediately? No, effect streams don't complete usually.
    // But here actions$ is 'of', so it completes.
  });
});
