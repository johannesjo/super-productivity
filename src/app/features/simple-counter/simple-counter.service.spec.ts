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
import { selectAllSimpleCounters } from './store/simple-counter.reducer';
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

    // Mock the selector to return counters
    store.overrideSelector(selectAllSimpleCounters, [
      createCounter('counter1', {
        countOnDay: { '2024-01-15': 6 },
      }),
    ]);
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

    it('should NOT immediately dispatch setSimpleCounterCounterToday (batched sync)', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      tick();

      // Should only dispatch the increment action, not the set action
      expect(dispatchSpy.calls.count()).toBe(1);
      expect(dispatchSpy.calls.argsFor(0)[0].type).toBe(
        '[SimpleCounter] Increase SimpleCounter Counter Today',
      );
    }));

    it('should dispatch setSimpleCounterCounterToday when flushed', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      tick();

      // Clear previous calls
      dispatchSpy.calls.reset();

      // Trigger flush
      service.flushAccumulatedTime();
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setSimpleCounterCounterToday({
          id: 'counter1',
          newVal: 6,
          today: '2024-01-15',
        }),
      );
    }));
  });

  describe('decreaseCounterToday', () => {
    beforeEach(() => {
      // Mock the selector to return the counter after decrement
      store.overrideSelector(selectAllSimpleCounters, [
        createCounter('counter1', {
          countOnDay: { '2024-01-15': 4 },
        }),
      ]);
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

    it('should NOT immediately dispatch setSimpleCounterCounterToday (batched sync)', fakeAsync(() => {
      service.decreaseCounterToday('counter1', 1);
      tick();

      // Should only dispatch the decrement action, not the set action
      expect(dispatchSpy.calls.count()).toBe(1);
      expect(dispatchSpy.calls.argsFor(0)[0].type).toBe(
        '[SimpleCounter] Decrease SimpleCounter Counter Today',
      );
    }));

    it('should dispatch setSimpleCounterCounterToday when flushed', fakeAsync(() => {
      service.decreaseCounterToday('counter1', 1);
      tick();

      // Clear previous calls
      dispatchSpy.calls.reset();

      // Trigger flush
      service.flushAccumulatedTime();
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setSimpleCounterCounterToday({
          id: 'counter1',
          newVal: 4,
          today: '2024-01-15',
        }),
      );
    }));
  });

  describe('batched sync behavior', () => {
    it('should batch multiple increments into single sync', fakeAsync(() => {
      service.increaseCounterToday('counter1', 1);
      service.increaseCounterToday('counter1', 1);
      service.increaseCounterToday('counter1', 1);
      tick();

      // Should have 3 increment dispatches
      expect(dispatchSpy.calls.count()).toBe(3);

      // Clear and flush
      dispatchSpy.calls.reset();
      service.flushAccumulatedTime();
      tick();

      // Should only have 1 sync dispatch (absolute value)
      expect(dispatchSpy.calls.count()).toBe(1);
      expect(dispatchSpy.calls.argsFor(0)[0].type).toBe(
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
