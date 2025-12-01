import {
  VectorClock,
  VectorClockComparison,
  initializeVectorClock,
  isVectorClockEmpty,
  compareVectorClocks,
  incrementVectorClock,
  mergeVectorClocks,
  vectorClockToString,
  hasVectorClockChanges,
  isValidVectorClock,
  sanitizeVectorClock,
  limitVectorClockSize,
  measureVectorClock,
} from './vector-clock';

describe('Vector Clock', () => {
  describe('initializeVectorClock', () => {
    it('should create a vector clock with initial value 0', () => {
      const clock = initializeVectorClock('client1');
      expect(clock).toEqual({ client1: 0 });
    });

    it('should create a vector clock with custom initial value', () => {
      const clock = initializeVectorClock('client1', 5);
      expect(clock).toEqual({ client1: 5 });
    });
  });

  describe('isVectorClockEmpty', () => {
    it('should return true for null', () => {
      expect(isVectorClockEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isVectorClockEmpty(undefined)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isVectorClockEmpty({})).toBe(true);
    });

    it('should return false for non-empty clock', () => {
      expect(isVectorClockEmpty({ client1: 1 })).toBe(false);
    });
  });

  describe('compareVectorClocks', () => {
    it('should return CONCURRENT for two empty clocks', () => {
      expect(compareVectorClocks({}, {})).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks(null, null)).toBe(VectorClockComparison.CONCURRENT);
    });

    it('should return EQUAL for identical clocks', () => {
      const clock1 = { client1: 5, client2: 3 };
      const clock2 = { client1: 5, client2: 3 };
      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.EQUAL);
    });

    it('should return LESS_THAN when first clock is behind', () => {
      const clock1 = { client1: 3, client2: 2 };
      const clock2 = { client1: 5, client2: 3 };
      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.LESS_THAN);
    });

    it('should return GREATER_THAN when first clock is ahead', () => {
      const clock1 = { client1: 5, client2: 3 };
      const clock2 = { client1: 3, client2: 2 };
      expect(compareVectorClocks(clock1, clock2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should return CONCURRENT for concurrent clocks', () => {
      const clock1 = { client1: 5, client2: 2 };
      const clock2 = { client1: 3, client2: 4 };
      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.CONCURRENT);
    });

    it('should handle missing components as 0', () => {
      const clock1 = { client1: 5 };
      const clock2 = { client1: 5, client2: 0 };
      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.EQUAL);
    });

    it('should handle comparison with empty clock', () => {
      const clock1 = { client1: 1 };
      expect(compareVectorClocks(clock1, {})).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks({}, clock1)).toBe(VectorClockComparison.CONCURRENT);
    });
  });

  describe('incrementVectorClock', () => {
    it('should increment existing component', () => {
      const clock = { client1: 5, client2: 3 };
      const result = incrementVectorClock(clock, 'client1');
      expect(result).toEqual({ client1: 6, client2: 3 });
      // Should not modify original
      expect(clock).toEqual({ client1: 5, client2: 3 });
    });

    it('should add new component if not exists', () => {
      const clock = { client1: 5 };
      const result = incrementVectorClock(clock, 'client2');
      expect(result).toEqual({ client1: 5, client2: 1 });
    });

    it('should handle empty clock', () => {
      const result = incrementVectorClock({}, 'client1');
      expect(result).toEqual({ client1: 1 });
    });

    it('should handle null clock', () => {
      const result = incrementVectorClock(null, 'client1');
      expect(result).toEqual({ client1: 1 });
    });

    it('should handle overflow protection', () => {
      const clock = { client1: Number.MAX_SAFE_INTEGER - 500 };
      const result = incrementVectorClock(clock, 'client1');
      expect(result).toEqual({ client1: 1 });
    });
  });

  describe('mergeVectorClocks', () => {
    it('should take maximum of each component', () => {
      const clock1 = { client1: 5, client2: 3, client3: 7 };
      const clock2 = { client1: 3, client2: 6, client3: 2 };
      const result = mergeVectorClocks(clock1, clock2);
      expect(result).toEqual({ client1: 5, client2: 6, client3: 7 });
    });

    it('should include components from both clocks', () => {
      const clock1 = { client1: 5, client2: 3 };
      const clock2 = { client2: 2, client3: 4 };
      const result = mergeVectorClocks(clock1, clock2);
      expect(result).toEqual({ client1: 5, client2: 3, client3: 4 });
    });

    it('should handle empty clocks', () => {
      const clock1 = { client1: 5 };
      expect(mergeVectorClocks(clock1, {})).toEqual({ client1: 5 });
      expect(mergeVectorClocks({}, clock1)).toEqual({ client1: 5 });
      expect(mergeVectorClocks({}, {})).toEqual({});
    });

    it('should handle null clocks', () => {
      const clock1 = { client1: 5 };
      expect(mergeVectorClocks(clock1, null)).toEqual({ client1: 5 });
      expect(mergeVectorClocks(null, clock1)).toEqual({ client1: 5 });
    });
  });

  describe('vectorClockToString', () => {
    it('should format vector clock as string', () => {
      const clock = { client2: 3, client1: 5 };
      expect(vectorClockToString(clock)).toBe('{client1:5, client2:3}');
    });

    it('should handle empty clock', () => {
      expect(vectorClockToString({})).toBe('{}');
    });

    it('should handle null clock', () => {
      expect(vectorClockToString(null)).toBe('{}');
    });

    it('should sort client IDs alphabetically', () => {
      const clock = { z: 1, a: 2, m: 3 };
      expect(vectorClockToString(clock)).toBe('{a:2, m:3, z:1}');
    });
  });

  describe('hasVectorClockChanges', () => {
    it('should detect changes when current is ahead', () => {
      const current = { client1: 5, client2: 3 };
      const reference = { client1: 3, client2: 3 };
      expect(hasVectorClockChanges(current, reference)).toBe(true);
    });

    it('should detect no changes when equal', () => {
      const current = { client1: 5, client2: 3 };
      const reference = { client1: 5, client2: 3 };
      expect(hasVectorClockChanges(current, reference)).toBe(false);
    });

    it('should detect no changes when current is behind', () => {
      const current = { client1: 3, client2: 3 };
      const reference = { client1: 5, client2: 3 };
      expect(hasVectorClockChanges(current, reference)).toBe(false);
    });

    it('should detect changes in new components', () => {
      const current = { client1: 5, client2: 1 };
      const reference = { client1: 5 };
      expect(hasVectorClockChanges(current, reference)).toBe(true);
    });

    it('should handle empty current clock', () => {
      const reference = { client1: 5 };
      expect(hasVectorClockChanges({}, reference)).toBe(true);
      expect(hasVectorClockChanges(null, reference)).toBe(true);
    });

    it('should handle empty reference clock', () => {
      const current = { client1: 5 };
      expect(hasVectorClockChanges(current, {})).toBe(true);
      expect(hasVectorClockChanges(current, null)).toBe(true);
    });

    it('should handle both empty', () => {
      expect(hasVectorClockChanges({}, {})).toBe(false);
      expect(hasVectorClockChanges(null, null)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical sync scenario', () => {
      // Initial state - both clients start at 0
      const clientA = initializeVectorClock('CLIENT_A');
      const clientB = initializeVectorClock('CLIENT_B');

      // Client A makes changes
      const clockA1 = incrementVectorClock(clientA, 'CLIENT_A');
      const clockA2 = incrementVectorClock(clockA1, 'CLIENT_A');

      // Client B makes changes
      const clockB1 = incrementVectorClock(clientB, 'CLIENT_B');

      // Check they are concurrent
      expect(compareVectorClocks(clockA2, clockB1)).toBe(
        VectorClockComparison.CONCURRENT,
      );

      // Client B syncs with A's changes
      const clockBSynced = mergeVectorClocks(clockB1, clockA2);
      expect(clockBSynced).toEqual({ CLIENT_A: 2, CLIENT_B: 1 });

      // Client B makes more changes
      const clockB2 = incrementVectorClock(clockBSynced, 'CLIENT_B');
      expect(clockB2).toEqual({ CLIENT_A: 2, CLIENT_B: 2 });

      // Now B is strictly ahead of A
      expect(compareVectorClocks(clockB2, clockA2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should detect true conflicts', () => {
      // Start with synced state
      const syncedClock: VectorClock = { CLIENT_A: 5, CLIENT_B: 3, CLIENT_C: 2 };

      // A and B both make changes independently
      const clockA = incrementVectorClock(syncedClock, 'CLIENT_A');
      const clockB = incrementVectorClock(syncedClock, 'CLIENT_B');

      // They should be concurrent (true conflict)
      expect(compareVectorClocks(clockA, clockB)).toBe(VectorClockComparison.CONCURRENT);

      // Both have changes since synced state
      expect(hasVectorClockChanges(clockA, syncedClock)).toBe(true);
      expect(hasVectorClockChanges(clockB, syncedClock)).toBe(true);
    });

    it('should handle three-way sync scenario', () => {
      // Three devices starting fresh
      const deviceA: VectorClock = {};
      const deviceB: VectorClock = {};
      const deviceC: VectorClock = {};

      // Device A makes initial changes
      const clockA1 = incrementVectorClock(deviceA, 'CLIENT_A');
      const clockA2 = incrementVectorClock(clockA1, 'CLIENT_A');

      // Device B syncs with A
      const clockB1 = mergeVectorClocks(deviceB, clockA2);
      const clockB2 = incrementVectorClock(clockB1, 'CLIENT_B');

      // Device C syncs with B (gets both A and B changes)
      const clockC1 = mergeVectorClocks(deviceC, clockB2);
      expect(clockC1).toEqual({ CLIENT_A: 2, CLIENT_B: 1 });

      // Device C makes changes
      const clockC2 = incrementVectorClock(clockC1, 'CLIENT_C');

      // Now C is ahead of both A and B
      expect(compareVectorClocks(clockC2, clockA2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
      expect(compareVectorClocks(clockC2, clockB2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should handle complex conflict resolution', () => {
      // Start with all devices synced
      const baseClock: VectorClock = { CLIENT_A: 10, CLIENT_B: 8, CLIENT_C: 5 };

      // Each device makes independent changes
      const clockA = incrementVectorClock(
        incrementVectorClock(baseClock, 'CLIENT_A'),
        'CLIENT_A',
      );
      const clockB = incrementVectorClock(baseClock, 'CLIENT_B');
      const clockC = incrementVectorClock(
        incrementVectorClock(incrementVectorClock(baseClock, 'CLIENT_C'), 'CLIENT_C'),
        'CLIENT_C',
      );

      // All should be concurrent with each other
      expect(compareVectorClocks(clockA, clockB)).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks(clockB, clockC)).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks(clockA, clockC)).toBe(VectorClockComparison.CONCURRENT);

      // Resolve by merging all clocks
      const resolved = mergeVectorClocks(mergeVectorClocks(clockA, clockB), clockC);
      expect(resolved).toEqual({ CLIENT_A: 12, CLIENT_B: 9, CLIENT_C: 8 });

      // Resolved clock should be greater than all individual clocks
      expect(compareVectorClocks(resolved, clockA)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
      expect(compareVectorClocks(resolved, clockB)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
      expect(compareVectorClocks(resolved, clockC)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should handle lost update scenario', () => {
      // Device A and B start synced
      const syncedState: VectorClock = { CLIENT_A: 5, CLIENT_B: 5 };

      // Device A makes changes
      const clockA1 = incrementVectorClock(syncedState, 'CLIENT_A');

      // Device B makes changes but doesn\'t sync
      const clockB1 = incrementVectorClock(syncedState, 'CLIENT_B');
      const clockB2 = incrementVectorClock(clockB1, 'CLIENT_B');

      // Device A syncs and overwrites B\'s first change
      const clockA2 = mergeVectorClocks(clockA1, { CLIENT_A: 5, CLIENT_B: 5 }); // B hasn't synced yet

      // Now when B tries to sync, conflict is detected
      expect(compareVectorClocks(clockA2, clockB2)).toBe(
        VectorClockComparison.CONCURRENT,
      );
    });

    it('should handle clock drift recovery', () => {
      // Simulate a device with drifted clock values
      const driftedClock: VectorClock = {
        CLIENT_A: 1000000,
        CLIENT_B: 999999,
        CLIENT_C: 1000001,
      };
      const normalClock: VectorClock = { CLIENT_A: 10, CLIENT_B: 8, CLIENT_C: 12 };

      // Merge should take maximum values
      const merged = mergeVectorClocks(driftedClock, normalClock);
      expect(merged).toEqual({ CLIENT_A: 1000000, CLIENT_B: 999999, CLIENT_C: 1000001 });

      // Comparison should still work correctly
      expect(compareVectorClocks(driftedClock, normalClock)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very large vector clocks', () => {
      const largeClock: VectorClock = {};
      // Create a clock with many clients
      for (let i = 0; i < 100; i++) {
        largeClock[`client${i}`] = i;
      }

      // Operations should still work
      const incremented = incrementVectorClock(largeClock, 'client50');
      expect(incremented.client50).toBe(51);

      const str = vectorClockToString(largeClock);
      expect(str).toContain('client0:0');
      expect(str).toContain('client99:99');
    });

    it('should handle special characters in client IDs', () => {
      const clock = initializeVectorClock('client-with-dash');
      const clock2 = incrementVectorClock(clock, 'client.with.dots');
      const clock3 = incrementVectorClock(clock2, 'client@email.com');

      expect(clock3).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'client-with-dash': 0,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'client.with.dots': 1,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'client@email.com': 1,
      });
    });

    it('should handle comparison with mixed empty/zero components', () => {
      const clock1 = { CLIENT_A: 0, CLIENT_B: 5, CLIENT_C: 0 };
      const clock2 = { CLIENT_B: 5 };

      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.EQUAL);
    });

    it('should handle increments near overflow gracefully', () => {
      const nearMax = Number.MAX_SAFE_INTEGER - 100;
      const clock = { CLIENT_A: nearMax };

      // First increment should trigger overflow protection
      const clock1 = incrementVectorClock(clock, 'CLIENT_A');
      expect(clock1.CLIENT_A).toBe(1);

      // Subsequent increments should work normally
      const clock2 = incrementVectorClock(clock1, 'CLIENT_A');
      expect(clock2.CLIENT_A).toBe(2);
    });

    it('should maintain consistency when merging with self', () => {
      const clock: VectorClock = { CLIENT_A: 5, CLIENT_B: 3 };
      const merged = mergeVectorClocks(clock, clock);

      expect(merged).toEqual(clock);
      expect(merged).not.toBe(clock); // Should be a new object
    });

    it('should handle comparison of single-client clocks', () => {
      const clock1 = { CLIENT_A: 5 };
      const clock2 = { CLIENT_A: 3 };

      expect(compareVectorClocks(clock1, clock2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid increments efficiently', () => {
      let clock: VectorClock = {};
      const clientId = 'rapidClient';

      // Perform many increments
      for (let i = 0; i < 1000; i++) {
        clock = incrementVectorClock(clock, clientId);
      }

      expect(clock[clientId]).toBe(1000);
    });

    it('should handle large merges efficiently', () => {
      const clock1: VectorClock = {};
      const clock2: VectorClock = {};

      // Create two large clocks with overlapping clients
      for (let i = 0; i < 50; i++) {
        clock1[`client${i}`] = i * 2;
        clock2[`client${i}`] = i * 3;
      }

      const merged = mergeVectorClocks(clock1, clock2);

      // Should have taken max of each
      for (let i = 0; i < 50; i++) {
        expect(merged[`client${i}`]).toBe(i * 3);
      }
    });
  });

  describe('Vector Clock Validation', () => {
    it('should validate correct vector clocks', () => {
      expect(isValidVectorClock({ a: 1, b: 2 })).toBe(true);
      expect(isValidVectorClock({})).toBe(true);
      expect(isValidVectorClock({ client1: 0 })).toBe(true);
      expect(isValidVectorClock({ client1: Number.MAX_SAFE_INTEGER })).toBe(true);
    });

    it('should reject invalid vector clocks', () => {
      expect(isValidVectorClock(null)).toBe(false);
      expect(isValidVectorClock(undefined)).toBe(false);
      expect(isValidVectorClock('string')).toBe(false);
      expect(isValidVectorClock(123)).toBe(false);
      expect(isValidVectorClock([])).toBe(false);
      expect(isValidVectorClock([1, 2, 3])).toBe(false);
    });

    it('should reject vector clocks with invalid values', () => {
      expect(isValidVectorClock({ a: -1 })).toBe(false);
      expect(isValidVectorClock({ a: 'string' as any })).toBe(false);
      expect(isValidVectorClock({ a: null as any })).toBe(false);
      expect(isValidVectorClock({ a: undefined as any })).toBe(false);
      expect(isValidVectorClock({ a: NaN })).toBe(false);
      expect(isValidVectorClock({ a: Infinity })).toBe(false);
      expect(isValidVectorClock({ a: Number.MAX_SAFE_INTEGER + 1 })).toBe(false);
    });

    it('should reject vector clocks with invalid keys', () => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      expect(isValidVectorClock({ '': 1 })).toBe(false);
      const objWithNumKey = {};
      (objWithNumKey as any)[123] = 1;
      expect(isValidVectorClock(objWithNumKey)).toBe(true); // Numbers are converted to strings
    });

    it('should handle non-plain objects', () => {
      class CustomClass {
        a = 1;
      }
      expect(isValidVectorClock(new CustomClass())).toBe(false);
      expect(isValidVectorClock(new Date())).toBe(false);
      expect(isValidVectorClock(/regex/)).toBe(false);
    });
  });

  describe('Vector Clock Sanitization', () => {
    it('should sanitize valid vector clocks', () => {
      const valid = { a: 1, b: 2 };
      expect(sanitizeVectorClock(valid)).toEqual(valid);
    });

    it('should remove invalid entries', () => {
      const invalid = {
        valid: 1,
        negative: -1,
        string: 'not a number' as any,
        null: null as any,
        undefined: undefined as any,
        nan: NaN,
        infinity: Infinity,
        tooLarge: Number.MAX_SAFE_INTEGER + 1,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '': 5, // Empty key
      };
      expect(sanitizeVectorClock(invalid)).toEqual({ valid: 1 });
    });

    it('should handle non-objects', () => {
      expect(sanitizeVectorClock(null)).toEqual({});
      expect(sanitizeVectorClock(undefined)).toEqual({});
      expect(sanitizeVectorClock('string' as any)).toEqual({});
      expect(sanitizeVectorClock(123 as any)).toEqual({});
      expect(sanitizeVectorClock([] as any)).toEqual({});
    });

    it('should handle objects that throw on iteration', () => {
      const problematic = {
        get a() {
          throw new Error('Property access error');
        },
      };
      expect(sanitizeVectorClock(problematic)).toEqual({});
    });

    it('should preserve zero values', () => {
      const withZero = { a: 0, b: 5 };
      expect(sanitizeVectorClock(withZero)).toEqual(withZero);
    });
  });

  describe('Vector Clock Size Limiting', () => {
    it('should not limit clocks under the threshold', () => {
      const small: VectorClock = {};
      for (let i = 0; i < 30; i++) {
        small[`client${i}`] = i;
      }

      const result = limitVectorClockSize(small, 'client0');
      expect(result).toEqual(small);
      expect(Object.keys(result).length).toBe(30);
    });

    it('should limit vector clock size to MAX_VECTOR_CLOCK_SIZE', () => {
      const large: VectorClock = {};
      for (let i = 0; i < 100; i++) {
        large[`client${i}`] = i;
      }

      const limited = limitVectorClockSize(large, 'myClient');
      expect(Object.keys(limited).length).toBe(50); // MAX_VECTOR_CLOCK_SIZE
    });

    it('should always preserve current client', () => {
      const large: VectorClock = {};
      for (let i = 0; i < 100; i++) {
        large[`client${i}`] = 100 - i; // Higher values for lower client numbers
      }
      large['myClient'] = 1; // Low value that would normally be pruned

      const limited = limitVectorClockSize(large, 'myClient');
      expect(limited['myClient']).toBe(1);
      expect(Object.keys(limited).length).toBe(50);
    });

    it('should keep clients with highest values', () => {
      const clock: VectorClock = {
        lowActivity1: 1,
        lowActivity2: 2,
        highActivity1: 100,
        highActivity2: 99,
        mediumActivity: 50,
        currentClient: 3,
      };

      // Create a large clock to trigger limiting
      for (let i = 0; i < 60; i++) {
        clock[`filler${i}`] = i + 10;
      }

      const limited = limitVectorClockSize(clock, 'currentClient');

      // Should keep high activity clients
      expect(limited['highActivity1']).toBe(100);
      expect(limited['highActivity2']).toBe(99);
      expect(limited['currentClient']).toBe(3); // Always kept

      // Should drop low activity clients
      expect(limited['lowActivity1']).toBeUndefined();
      expect(limited['lowActivity2']).toBeUndefined();
    });

    it('should handle current client not in clock', () => {
      const clock: VectorClock = {};
      for (let i = 0; i < 60; i++) {
        clock[`client${i}`] = i;
      }

      const limited = limitVectorClockSize(clock, 'newClient');
      expect(Object.keys(limited).length).toBe(50);
      expect(limited['newClient']).toBeUndefined();
    });

    it('should handle empty clock', () => {
      const limited = limitVectorClockSize({}, 'client1');
      expect(limited).toEqual({});
    });

    it('should maintain consistency when limiting', () => {
      const clock: VectorClock = {};
      // Create entries with distinct values
      for (let i = 0; i < 100; i++) {
        clock[`client${i}`] = 1000 - i;
      }

      const limited = limitVectorClockSize(clock, 'client99');

      // Verify we kept the highest values
      const values = Object.values(limited).sort((a, b) => b - a);
      expect(values[0]).toBe(1000); // Highest value
      expect(values.length).toBe(50);

      // client99 should be included even with low value
      expect(limited['client99']).toBe(901);
    });
  });

  describe('Vector Clock Metrics', () => {
    it('should measure empty vector clock', () => {
      expect(measureVectorClock(null)).toEqual({
        size: 0,
        comparisonTime: 0,
        pruningOccurred: false,
      });
      expect(measureVectorClock(undefined)).toEqual({
        size: 0,
        comparisonTime: 0,
        pruningOccurred: false,
      });
      expect(measureVectorClock({})).toEqual({
        size: 0,
        comparisonTime: 0,
        pruningOccurred: false,
      });
    });

    it('should measure vector clock size', () => {
      const clock = { a: 1, b: 2, c: 3 };
      const metrics = measureVectorClock(clock);
      expect(metrics.size).toBe(3);
      expect(metrics.comparisonTime).toBe(0);
      expect(metrics.pruningOccurred).toBe(false);
    });

    it('should measure large vector clock', () => {
      const clock: VectorClock = {};
      for (let i = 0; i < 75; i++) {
        clock[`client${i}`] = i;
      }
      const metrics = measureVectorClock(clock);
      expect(metrics.size).toBe(75);
    });
  });
});
