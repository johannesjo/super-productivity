import { fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { isOnline, isOnline$ } from './is-online';

describe('isOnline utilities', () => {
  describe('isOnline()', () => {
    it('should return true when navigator.onLine is true', () => {
      spyOnProperty(navigator, 'onLine').and.returnValue(true);
      expect(isOnline()).toBe(true);
    });

    it('should return true when navigator.onLine is undefined (not false)', () => {
      spyOnProperty(navigator, 'onLine').and.returnValue(undefined as any);
      expect(isOnline()).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      spyOnProperty(navigator, 'onLine').and.returnValue(false);
      expect(isOnline()).toBe(false);
    });
  });

  describe('isOnline$', () => {
    it('should emit a boolean value when subscribed', fakeAsync(() => {
      spyOnProperty(navigator, 'onLine').and.returnValue(true);

      const values: boolean[] = [];
      const sub = isOnline$.subscribe((v) => values.push(v));

      // Due to shareReplay(1), a value may already be cached
      // After debounce time, we should have a value
      tick(1000);
      expect(values.length).toBeGreaterThanOrEqual(1);
      expect(typeof values[0]).toBe('boolean');

      sub.unsubscribe();
      discardPeriodicTasks();
    }));

    it('should share the same stream across multiple subscribers (shareReplay)', fakeAsync(() => {
      spyOnProperty(navigator, 'onLine').and.returnValue(true);

      const values1: boolean[] = [];
      const values2: boolean[] = [];

      const sub1 = isOnline$.subscribe((v) => values1.push(v));
      const sub2 = isOnline$.subscribe((v) => values2.push(v));

      tick(1000);

      // Both subscribers should receive the same value
      expect(values1).toEqual([true]);
      expect(values2).toEqual([true]);

      sub1.unsubscribe();
      sub2.unsubscribe();
      discardPeriodicTasks();
    }));

    it('should debounce rapid state changes', fakeAsync(() => {
      spyOnProperty(navigator, 'onLine').and.returnValue(true);

      const values: boolean[] = [];
      const sub = isOnline$.subscribe((v) => values.push(v));

      // Simulate rapid online/offline events (faster than debounce time)
      window.dispatchEvent(new Event('offline'));
      tick(200);
      window.dispatchEvent(new Event('online'));
      tick(200);
      window.dispatchEvent(new Event('offline'));
      tick(200);
      window.dispatchEvent(new Event('online'));

      // Still within debounce window, no emissions yet except possibly initial
      tick(1000);

      // After debounce, only the final state should be emitted
      // The exact behavior depends on timing, but we verify no rapid flip-flopping
      expect(values.length).toBeLessThanOrEqual(2);

      sub.unsubscribe();
      discardPeriodicTasks();
    }));

    it('should not emit duplicate values due to distinctUntilChanged', fakeAsync(() => {
      spyOnProperty(navigator, 'onLine').and.returnValue(true);

      const values: boolean[] = [];
      const sub = isOnline$.subscribe((v) => values.push(v));

      tick(1000);
      expect(values).toEqual([true]);

      // Dispatch online event when already online - should not emit duplicate
      window.dispatchEvent(new Event('online'));
      tick(1000);

      // Still only one value due to distinctUntilChanged
      expect(values).toEqual([true]);

      sub.unsubscribe();
      discardPeriodicTasks();
    }));
  });
});
