import {
  VectorClock,
  VectorClockComparison,
  initializeVectorClock,
  isVectorClockEmpty,
  compareVectorClocks,
  incrementVectorClock,
  mergeVectorClocks,
  lamportToVectorClock,
  vectorClockToString,
  hasVectorClockChanges,
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
    it('should return EQUAL for two empty clocks', () => {
      expect(compareVectorClocks({}, {})).toBe(VectorClockComparison.EQUAL);
      expect(compareVectorClocks(null, null)).toBe(VectorClockComparison.EQUAL);
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
      expect(compareVectorClocks(clock1, {})).toBe(VectorClockComparison.GREATER_THAN);
      expect(compareVectorClocks({}, clock1)).toBe(VectorClockComparison.LESS_THAN);
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

  describe('lamportToVectorClock', () => {
    it('should convert positive Lamport timestamp', () => {
      const result = lamportToVectorClock(5, 'client1');
      expect(result).toEqual({ client1: 5 });
    });

    it('should return empty clock for null', () => {
      const result = lamportToVectorClock(null, 'client1');
      expect(result).toEqual({});
    });

    it('should return empty clock for 0', () => {
      const result = lamportToVectorClock(0, 'client1');
      expect(result).toEqual({});
    });

    it('should return empty clock for undefined', () => {
      const result = lamportToVectorClock(undefined, 'client1');
      expect(result).toEqual({});
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
      expect(hasVectorClockChanges({}, reference)).toBe(false);
      expect(hasVectorClockChanges(null, reference)).toBe(false);
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
      const clientA = initializeVectorClock('A');
      const clientB = initializeVectorClock('B');

      // Client A makes changes
      const clockA1 = incrementVectorClock(clientA, 'A');
      const clockA2 = incrementVectorClock(clockA1, 'A');

      // Client B makes changes
      const clockB1 = incrementVectorClock(clientB, 'B');

      // Check they are concurrent
      expect(compareVectorClocks(clockA2, clockB1)).toBe(
        VectorClockComparison.CONCURRENT,
      );

      // Client B syncs with A's changes
      const clockBSynced = mergeVectorClocks(clockB1, clockA2);
      expect(clockBSynced).toEqual({ A: 2, B: 1 });

      // Client B makes more changes
      const clockB2 = incrementVectorClock(clockBSynced, 'B');
      expect(clockB2).toEqual({ A: 2, B: 2 });

      // Now B is strictly ahead of A
      expect(compareVectorClocks(clockB2, clockA2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should detect true conflicts', () => {
      // Start with synced state
      const syncedClock: VectorClock = { A: 5, B: 3, C: 2 };

      // A and B both make changes independently
      const clockA = incrementVectorClock(syncedClock, 'A');
      const clockB = incrementVectorClock(syncedClock, 'B');

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
      const clockA1 = incrementVectorClock(deviceA, 'A');
      const clockA2 = incrementVectorClock(clockA1, 'A');

      // Device B syncs with A
      const clockB1 = mergeVectorClocks(deviceB, clockA2);
      const clockB2 = incrementVectorClock(clockB1, 'B');

      // Device C syncs with B (gets both A and B changes)
      const clockC1 = mergeVectorClocks(deviceC, clockB2);
      expect(clockC1).toEqual({ A: 2, B: 1 });

      // Device C makes changes
      const clockC2 = incrementVectorClock(clockC1, 'C');

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
      const baseClock: VectorClock = { A: 10, B: 8, C: 5 };

      // Each device makes independent changes
      const clockA = incrementVectorClock(incrementVectorClock(baseClock, 'A'), 'A');
      const clockB = incrementVectorClock(baseClock, 'B');
      const clockC = incrementVectorClock(
        incrementVectorClock(incrementVectorClock(baseClock, 'C'), 'C'),
        'C',
      );

      // All should be concurrent with each other
      expect(compareVectorClocks(clockA, clockB)).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks(clockB, clockC)).toBe(VectorClockComparison.CONCURRENT);
      expect(compareVectorClocks(clockA, clockC)).toBe(VectorClockComparison.CONCURRENT);

      // Resolve by merging all clocks
      const resolved = mergeVectorClocks(mergeVectorClocks(clockA, clockB), clockC);
      expect(resolved).toEqual({ A: 12, B: 9, C: 8 });

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
      const syncedState: VectorClock = { A: 5, B: 5 };

      // Device A makes changes
      const clockA1 = incrementVectorClock(syncedState, 'A');

      // Device B makes changes but doesn\'t sync
      const clockB1 = incrementVectorClock(syncedState, 'B');
      const clockB2 = incrementVectorClock(clockB1, 'B');

      // Device A syncs and overwrites B\'s first change
      const clockA2 = mergeVectorClocks(clockA1, { A: 5, B: 5 }); // B hasn't synced yet

      // Now when B tries to sync, conflict is detected
      expect(compareVectorClocks(clockA2, clockB2)).toBe(
        VectorClockComparison.CONCURRENT,
      );
    });

    it('should handle clock drift recovery', () => {
      // Simulate a device with drifted clock values
      const driftedClock: VectorClock = { A: 1000000, B: 999999, C: 1000001 };
      const normalClock: VectorClock = { A: 10, B: 8, C: 12 };

      // Merge should take maximum values
      const merged = mergeVectorClocks(driftedClock, normalClock);
      expect(merged).toEqual({ A: 1000000, B: 999999, C: 1000001 });

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
      const clock1 = { A: 0, B: 5, C: 0 };
      const clock2 = { B: 5 };

      expect(compareVectorClocks(clock1, clock2)).toBe(VectorClockComparison.EQUAL);
    });

    it('should handle increments near overflow gracefully', () => {
      const nearMax = Number.MAX_SAFE_INTEGER - 100;
      const clock = { A: nearMax };

      // First increment should trigger overflow protection
      const clock1 = incrementVectorClock(clock, 'A');
      expect(clock1.A).toBe(1);

      // Subsequent increments should work normally
      const clock2 = incrementVectorClock(clock1, 'A');
      expect(clock2.A).toBe(2);
    });

    it('should maintain consistency when merging with self', () => {
      const clock: VectorClock = { A: 5, B: 3 };
      const merged = mergeVectorClocks(clock, clock);

      expect(merged).toEqual(clock);
      expect(merged).not.toBe(clock); // Should be a new object
    });

    it('should handle comparison of single-client clocks', () => {
      const clock1 = { A: 5 };
      const clock2 = { A: 3 };

      expect(compareVectorClocks(clock1, clock2)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });
  });

  describe('Backwards compatibility scenarios', () => {
    it('should handle migration from Lamport timestamps', () => {
      // Simulate device with only Lamport timestamp
      const lamportValue = 42;
      const migratedClock = lamportToVectorClock(lamportValue, 'deviceA');

      expect(migratedClock).toEqual({ deviceA: 42 });

      // Should be able to increment normally after migration
      const incremented = incrementVectorClock(migratedClock, 'deviceA');
      expect(incremented).toEqual({ deviceA: 43 });
    });

    it('should handle mixed Lamport/vector clock comparison', () => {
      // Device A has vector clock, Device B has Lamport
      const vectorClock: VectorClock = { A: 10, B: 5 };
      const lamportClock = lamportToVectorClock(8, 'B');

      // B's Lamport 8 is higher than its component in A's vector (5)
      const merged = mergeVectorClocks(vectorClock, lamportClock);
      expect(merged).toEqual({ A: 10, B: 8 });
    });

    it('should handle empty to non-empty migration', () => {
      // Device starts with no clock
      let deviceClock: VectorClock | undefined = undefined;

      // First update creates clock
      deviceClock = incrementVectorClock(deviceClock, 'device1');
      expect(deviceClock).toEqual({ device1: 1 });

      // Can continue incrementing
      deviceClock = incrementVectorClock(deviceClock, 'device1');
      expect(deviceClock).toEqual({ device1: 2 });
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
});
