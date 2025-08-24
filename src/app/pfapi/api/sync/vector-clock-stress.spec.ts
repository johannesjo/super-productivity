import {
  VectorClock,
  incrementVectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  limitVectorClockSize,
  VectorClockComparison,
} from '../util/vector-clock';

describe('Vector Clock Stress Tests', () => {
  describe('Large Scale Operations', () => {
    it('should handle vector clocks with hundreds of clients', () => {
      const clock1: VectorClock = {};
      const clock2: VectorClock = {};

      // Create two large vector clocks
      for (let i = 0; i < 500; i++) {
        clock1[`CLIENT_A_${i}`] = Math.floor(Math.random() * 1000);
        clock2[`CLIENT_B_${i}`] = Math.floor(Math.random() * 1000);
      }

      const startMerge = performance.now();
      const merged = mergeVectorClocks(clock1, clock2);
      const mergeDuration = performance.now() - startMerge;

      expect(Object.keys(merged).length).toBeGreaterThan(500);
      expect(mergeDuration).toBeLessThan(50); // Should merge quickly

      // Test pruning performance
      const startPrune = performance.now();
      const pruned = limitVectorClockSize(merged, 'CLIENT_A_0');
      const pruneDuration = performance.now() - startPrune;

      expect(Object.keys(pruned).length).toBe(50);
      expect(pruneDuration).toBeLessThan(25); // Pruning should be fast (increased threshold for CI/different environments)
    });

    it('should handle deeply nested comparison scenarios', () => {
      const numClients = 100;
      const clock1: VectorClock = {};
      const clock2: VectorClock = {};

      // Create complex concurrent scenario
      for (let i = 0; i < numClients; i++) {
        if (i % 2 === 0) {
          clock1[`CLIENT_${i}`] = i * 2;
          clock2[`CLIENT_${i}`] = i;
        } else {
          clock1[`CLIENT_${i}`] = i;
          clock2[`CLIENT_${i}`] = i * 2;
        }
      }

      const startCompare = performance.now();
      const comparison = compareVectorClocks(clock1, clock2);
      const compareDuration = performance.now() - startCompare;

      expect(comparison).toBe(VectorClockComparison.CONCURRENT);
      expect(compareDuration).toBeLessThan(5); // Comparison should be very fast
    });
  });

  describe('Concurrent Modification Simulation', () => {
    it('should handle rapid concurrent updates from multiple clients', () => {
      let sharedClock: VectorClock = {};
      const clients = Array.from({ length: 20 }, (_, i) => `CLIENT_${i}`);
      const updatesPerClient = 50;

      // Simulate concurrent updates (in JS this is sequential, but tests the logic)
      const updates: Array<{ client: string; clock: VectorClock }> = [];

      for (let round = 0; round < updatesPerClient; round++) {
        for (const client of clients) {
          sharedClock = incrementVectorClock(sharedClock, client);
          updates.push({ client, clock: { ...sharedClock } });
        }
      }

      // Verify all updates were applied
      expect(Object.keys(sharedClock).length).toBe(20);
      clients.forEach((client) => {
        expect(sharedClock[client]).toBe(updatesPerClient);
      });

      // Test merging from different points in history
      const midPoint = Math.floor(updates.length / 2);
      const clockAtMidpoint = updates[midPoint].clock;
      const finalClock = updates[updates.length - 1].clock;

      const comparison = compareVectorClocks(finalClock, clockAtMidpoint);
      expect(comparison).toBe(VectorClockComparison.GREATER_THAN);
    });
  });

  describe('Memory and Size Constraints', () => {
    it('should maintain reasonable memory usage with pruning', () => {
      const clientId = 'MAIN_CLIENT';
      let clock: VectorClock = { [clientId]: 1000 };

      // Simulate many clients joining and leaving
      for (let i = 0; i < 1000; i++) {
        clock[`TEMP_CLIENT_${i}`] = Math.floor(Math.random() * 100);

        // Prune every 100 additions
        if (i % 100 === 0) {
          clock = limitVectorClockSize(clock, clientId);
        }
      }

      // Final pruning
      clock = limitVectorClockSize(clock, clientId);

      expect(Object.keys(clock).length).toBe(50);
      expect(clock[clientId]).toBe(1000); // Main client preserved

      // Verify we kept the most active clients
      const values = Object.entries(clock)
        .filter(([k]) => k !== clientId)
        .map(([, v]) => v)
        .sort((a, b) => b - a);

      expect(values[0]).toBeGreaterThan(50); // Should keep high-value clients
    });

    it('should handle extreme clock values near limits', () => {
      const clock: VectorClock = {
        CLIENT_A: Number.MAX_SAFE_INTEGER - 1000,
        CLIENT_B: Number.MAX_SAFE_INTEGER - 2000,
        CLIENT_C: 999999999,
      };

      // Test overflow protection
      let updated = incrementVectorClock(clock, 'CLIENT_A');
      expect(updated.CLIENT_A).toBe(1); // Should reset immediately due to overflow protection

      // Continue incrementing after reset
      updated = incrementVectorClock(updated, 'CLIENT_A');
      expect(updated.CLIENT_A).toBe(2); // Normal increment after reset
      expect(updated.CLIENT_B).toBe(clock.CLIENT_B); // Others unchanged
    });
  });

  describe('Network Partition Simulation', () => {
    it('should handle vector clocks after network partition', () => {
      // Initial synchronized state
      const initialClock: VectorClock = {
        PARTITION_A: 100,
        PARTITION_B: 100,
        PARTITION_C: 100,
      };

      // Simulate partition - each partition evolves independently
      let partitionA = { ...initialClock };
      let partitionB = { ...initialClock };
      let partitionC = { ...initialClock };

      // Partition A makes progress
      for (let i = 0; i < 50; i++) {
        partitionA = incrementVectorClock(partitionA, 'PARTITION_A');
        partitionA[`PARTITION_A_CLIENT_${i}`] = i;
      }

      // Partition B makes different progress
      for (let i = 0; i < 30; i++) {
        partitionB = incrementVectorClock(partitionB, 'PARTITION_B');
        partitionB[`PARTITION_B_CLIENT_${i}`] = i * 2;
      }

      // Partition C makes minimal progress
      for (let i = 0; i < 10; i++) {
        partitionC = incrementVectorClock(partitionC, 'PARTITION_C');
      }

      // Network heals - merge all partitions
      const merged = mergeVectorClocks(
        mergeVectorClocks(partitionA, partitionB),
        partitionC,
      );

      // Verify merge preserves maximum values
      expect(merged.PARTITION_A).toBe(150);
      expect(merged.PARTITION_B).toBe(130);
      expect(merged.PARTITION_C).toBe(110);

      // Check for conflicts
      const compAB = compareVectorClocks(partitionA, partitionB);
      expect(compAB).toBe(VectorClockComparison.CONCURRENT);

      // Prune to manageable size
      const pruned = limitVectorClockSize(merged, 'PARTITION_A');
      expect(Object.keys(pruned).length).toBe(50);
    });
  });

  describe('Clock Skew and Time Issues', () => {
    it('should handle vector clocks independently of system time', () => {
      const clock: VectorClock = {};
      const clientId = 'TIME_TEST_CLIENT';

      // Vector clocks should not depend on system time
      const before = Date.now();

      // Simulate time jump (would affect timestamp-based systems)
      spyOn(Date, 'now').and.returnValue(before + 3600000); // 1 hour jump

      clock[clientId] = 1;
      const incremented = incrementVectorClock(clock, clientId);

      expect(incremented[clientId]).toBe(2); // Should increment normally

      // Reset time
      (Date.now as jasmine.Spy).and.returnValue(before - 3600000); // 1 hour back

      const incrementedAgain = incrementVectorClock(incremented, clientId);
      expect(incrementedAgain[clientId]).toBe(3); // Still increments normally
    });
  });

  describe('Malicious Input Protection', () => {
    it('should handle malicious vector clock data', () => {
      const longKey = 'CLIENT_'.repeat(1000);
      const maliciousClock: any = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __proto__: { evil: true },
        constructor: { name: 'Evil' },
        CLIENT_NORMAL: 5,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '': 10, // Empty key
      };
      maliciousClock[longKey] = 20; // Very long key

      // Operations should not crash or expose internals
      const merged = mergeVectorClocks(maliciousClock, { SAFE_CLIENT: 10 });
      expect(merged.SAFE_CLIENT).toBe(10);
      expect(merged.evil).toBeUndefined(); // Prototype pollution prevented

      const pruned = limitVectorClockSize(merged, 'SAFE_CLIENT');
      expect(Object.keys(pruned).length).toBeLessThanOrEqual(50);
    });

    it('should handle DoS attempts with large vector clocks', () => {
      const startTime = performance.now();

      // Attempt to create massive vector clock
      const massive: VectorClock = {};
      for (let i = 0; i < 10000; i++) {
        massive[`ATTACKER_${i}`] = i;
      }

      // Operations should still complete in reasonable time
      const pruned = limitVectorClockSize(massive, 'DEFENDER');
      const duration = performance.now() - startTime;

      expect(Object.keys(pruned).length).toBe(50);
      expect(duration).toBeLessThan(100); // Should complete quickly despite size
    });
  });
});
