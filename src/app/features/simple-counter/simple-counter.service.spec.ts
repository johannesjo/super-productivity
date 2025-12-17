/* eslint-disable @typescript-eslint/naming-convention */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SimpleCounterService } from './simple-counter.service';
import { SimpleCounter, SimpleCounterType } from './simple-counter.model';
import { EMPTY_SIMPLE_COUNTER } from './simple-counter.const';
import {
  increaseSimpleCounterCounterToday,
  decreaseSimpleCounterCounterToday,
  setSimpleCounterCounterToday,
} from './store/simple-counter.actions';
import { selectSimpleCounterById } from './store/simple-counter.reducer';
import { DateService } from 'src/app/core/date/date.service';

describe('SimpleCounterService', () => {
  let service: SimpleCounterService;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const mockDateService = {
    todayStr: () => '2024-01-15',
  };

  const createCounter = (
    id: string,
    partial: Partial<SimpleCounter> = {},
  ): SimpleCounter => ({
    ...EMPTY_SIMPLE_COUNTER,
    id,
    title: `Counter ${id}`,
    isEnabled: true,
    type: SimpleCounterType.ClickCounter,
    ...partial,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SimpleCounterService,
        provideMockStore({
          initialState: {
            simpleCounter: {
              ids: ['counter1'],
              entities: {
                counter1: createCounter('counter1', {
                  countOnDay: { '2024-01-15': 5 },
                }),
              },
            },
          },
        }),
        { provide: DateService, useValue: mockDateService },
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(SimpleCounterService);
    dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    // Mock the selector to return the counter after increment
    store.overrideSelector(
      selectSimpleCounterById,
      createCounter('counter1', {
        countOnDay: { '2024-01-15': 6 },
      }),
    );
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('increaseCounterToday', () => {
    it('should dispatch increaseSimpleCounterCounterToday for local UI update', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        increaseSimpleCounterCounterToday({
          id: 'counter1',
          increaseBy: 1,
          today: '2024-01-15',
        }),
      );
    }));

    it('should dispatch setSimpleCounterCounterToday with absolute value for sync', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setSimpleCounterCounterToday({
          id: 'counter1',
          newVal: 6,
          today: '2024-01-15',
        }),
      );
    }));

    it('should dispatch both actions in correct order', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy.calls.count()).toBe(2);
      // First call: increment (local UI)
      expect(dispatchSpy.calls.argsFor(0)[0].type).toBe(
        '[SimpleCounter] Increase SimpleCounter Counter Today',
      );
      // Second call: set (sync)
      expect(dispatchSpy.calls.argsFor(1)[0].type).toBe(
        '[SimpleCounter] Set SimpleCounter Counter Today',
      );
    }));
  });

  describe('decreaseCounterToday', () => {
    beforeEach(() => {
      // Mock the selector to return the counter after decrement
      store.overrideSelector(
        selectSimpleCounterById,
        createCounter('counter1', {
          countOnDay: { '2024-01-15': 4 },
        }),
      );
    });

    it('should dispatch decreaseSimpleCounterCounterToday for local UI update', fakeAsync(() => {
      service.decreaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        decreaseSimpleCounterCounterToday({
          id: 'counter1',
          decreaseBy: 1,
          today: '2024-01-15',
        }),
      );
    }));

    it('should dispatch setSimpleCounterCounterToday with absolute value for sync', fakeAsync(() => {
      service.decreaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setSimpleCounterCounterToday({
          id: 'counter1',
          newVal: 4,
          today: '2024-01-15',
        }),
      );
    }));

    it('should dispatch both actions in correct order', fakeAsync(() => {
      service.decreaseCounterToday('counter1', 1);
      tick();

      expect(dispatchSpy.calls.count()).toBe(2);
      // First call: decrement (local UI)
      expect(dispatchSpy.calls.argsFor(0)[0].type).toBe(
        '[SimpleCounter] Decrease SimpleCounter Counter Today',
      );
      // Second call: set (sync)
      expect(dispatchSpy.calls.argsFor(1)[0].type).toBe(
        '[SimpleCounter] Set SimpleCounter Counter Today',
      );
    }));
  });

  describe('sync behavior', () => {
    it('increaseSimpleCounterCounterToday should NOT have persistence metadata', () => {
      const action = increaseSimpleCounterCounterToday({
        id: 'counter1',
        increaseBy: 1,
        today: '2024-01-15',
      }) as any;

      expect(action.meta).toBeUndefined();
    });

    it('decreaseSimpleCounterCounterToday should NOT have persistence metadata', () => {
      const action = decreaseSimpleCounterCounterToday({
        id: 'counter1',
        decreaseBy: 1,
        today: '2024-01-15',
      }) as any;

      expect(action.meta).toBeUndefined();
    });

    it('setSimpleCounterCounterToday should have persistence metadata', () => {
      const action = setSimpleCounterCounterToday({
        id: 'counter1',
        newVal: 6,
        today: '2024-01-15',
      });

      expect(action.meta.isPersistent).toBe(true);
      expect(action.meta.entityType).toBe('SIMPLE_COUNTER');
    });
  });
});
