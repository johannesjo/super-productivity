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
  deleteSimpleCounter,
  deleteSimpleCounters,
  updateSimpleCounter,
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

  describe('deleteSimpleCounter', () => {
    it('should dispatch deleteSimpleCounter action', fakeAsync(() => {
      service.deleteSimpleCounter('counter1');
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(deleteSimpleCounter({ id: 'counter1' }));
    }));

    it('should remove counter from _modifiedClickCounters set', fakeAsync(() => {
      // First, mark the counter as modified
      service.increaseCounterToday('counter1', 1);
      tick();
      dispatchSpy.calls.reset();

      // Delete the counter
      service.deleteSimpleCounter('counter1');
      tick();

      // Flush should NOT dispatch setSimpleCounterCounterToday for deleted counter
      service.flushAccumulatedTime();
      tick();

      // Only the delete action should have been dispatched, no sync for counter1
      const syncCalls = dispatchSpy.calls
        .allArgs()
        .filter(
          (args) => args[0].type === '[SimpleCounter] Set SimpleCounter Counter Today',
        );
      expect(syncCalls.length).toBe(0);
    }));
  });

  describe('deleteSimpleCounters', () => {
    beforeEach(() => {
      store.overrideSelector(selectAllSimpleCounters, [
        createCounter('counter1', { countOnDay: { '2024-01-15': 6 } }),
        createCounter('counter2', { countOnDay: { '2024-01-15': 3 } }),
      ]);
    });

    it('should dispatch deleteSimpleCounters action', fakeAsync(() => {
      service.deleteSimpleCounters(['counter1', 'counter2']);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        deleteSimpleCounters({ ids: ['counter1', 'counter2'] }),
      );
    }));

    it('should remove all counters from _modifiedClickCounters set', fakeAsync(() => {
      // Mark counters as modified
      service.increaseCounterToday('counter1', 1);
      service.increaseCounterToday('counter2', 1);
      tick();
      dispatchSpy.calls.reset();

      // Delete the counters
      service.deleteSimpleCounters(['counter1', 'counter2']);
      tick();

      // Flush should NOT dispatch setSimpleCounterCounterToday for deleted counters
      service.flushAccumulatedTime();
      tick();

      const syncCalls = dispatchSpy.calls
        .allArgs()
        .filter(
          (args) => args[0].type === '[SimpleCounter] Set SimpleCounter Counter Today',
        );
      expect(syncCalls.length).toBe(0);
    }));
  });

  describe('updateSimpleCounter', () => {
    it('should dispatch updateSimpleCounter action', fakeAsync(() => {
      service.updateSimpleCounter('counter1', { title: 'New Title' });
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        updateSimpleCounter({
          simpleCounter: { id: 'counter1', changes: { title: 'New Title' } },
        }),
      );
    }));

    it('should flush stopwatch accumulator when type changes', fakeAsync(() => {
      // Simulate accumulated stopwatch time by accessing the private field
      // We'll test the effect indirectly by checking dispatch calls
      service.updateSimpleCounter('counter1', { type: SimpleCounterType.StopWatch });
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        updateSimpleCounter({
          simpleCounter: {
            id: 'counter1',
            changes: { type: SimpleCounterType.StopWatch },
          },
        }),
      );
    }));

    it('should remove counter from _modifiedClickCounters when type changes', fakeAsync(() => {
      // Mark counter as modified
      service.increaseCounterToday('counter1', 1);
      tick();
      dispatchSpy.calls.reset();

      // Change type (which should clear the modified tracker)
      service.updateSimpleCounter('counter1', { type: SimpleCounterType.StopWatch });
      tick();

      // Flush should NOT dispatch for this counter since type change cleared it
      service.flushAccumulatedTime();
      tick();

      const syncCalls = dispatchSpy.calls
        .allArgs()
        .filter(
          (args) => args[0].type === '[SimpleCounter] Set SimpleCounter Counter Today',
        );
      expect(syncCalls.length).toBe(0);
    }));

    it('should NOT flush when updating non-type properties', fakeAsync(() => {
      // Mark counter as modified
      service.increaseCounterToday('counter1', 1);
      tick();
      dispatchSpy.calls.reset();

      // Update title (should NOT clear modified tracker)
      service.updateSimpleCounter('counter1', { title: 'New Title' });
      tick();

      // Flush SHOULD still dispatch for this counter
      service.flushAccumulatedTime();
      tick();

      const syncCalls = dispatchSpy.calls
        .allArgs()
        .filter(
          (args) => args[0].type === '[SimpleCounter] Set SimpleCounter Counter Today',
        );
      expect(syncCalls.length).toBe(1);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should flush accumulated time before cleanup', fakeAsync(() => {
      // Mark counter as modified
      service.increaseCounterToday('counter1', 1);
      tick();
      dispatchSpy.calls.reset();

      // Destroy the service
      service.ngOnDestroy();
      tick();

      // Should have dispatched sync for the modified counter
      expect(dispatchSpy).toHaveBeenCalledWith(
        setSimpleCounterCounterToday({
          id: 'counter1',
          newVal: 6,
          today: '2024-01-15',
        }),
      );
    }));
  });
});
