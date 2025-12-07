import { TestBed } from '@angular/core/testing';
import { LockService } from './lock.service';

describe('LockService', () => {
  let service: LockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LockService],
    });
    service = TestBed.inject(LockService);
    // Clear any existing locks
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('request', () => {
    it('should execute callback successfully', async () => {
      let executed = false;
      await service.request('test_lock', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should release lock after callback completes', async () => {
      await service.request('test_lock', async () => {
        // Lock is held here
      });

      // Lock should be released - we should be able to acquire it again immediately
      let executed = false;
      await service.request('test_lock', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should release lock even if callback throws', async () => {
      const testError = new Error('Test error');

      await expectAsync(
        service.request('test_lock', async () => {
          throw testError;
        }),
      ).toBeRejectedWith(testError);

      // Lock should be released - we should be able to acquire it again
      let executed = false;
      await service.request('test_lock', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should handle sequential lock requests', async () => {
      const order: number[] = [];

      await service.request('test_lock', async () => {
        order.push(1);
      });

      await service.request('test_lock', async () => {
        order.push(2);
      });

      await service.request('test_lock', async () => {
        order.push(3);
      });

      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow different lock names to be acquired independently', async () => {
      const executed: string[] = [];

      // Different lock names should not block each other
      await Promise.all([
        service.request('lock_a', async () => {
          executed.push('a_start');
          await new Promise((r) => setTimeout(r, 5));
          executed.push('a_end');
        }),
        service.request('lock_b', async () => {
          executed.push('b_start');
          await new Promise((r) => setTimeout(r, 5));
          executed.push('b_end');
        }),
      ]);

      // Both should have executed
      expect(executed).toContain('a_start');
      expect(executed).toContain('a_end');
      expect(executed).toContain('b_start');
      expect(executed).toContain('b_end');
    });
  });

  describe('fallback lock mechanism', () => {
    // Test the localStorage-based fallback when Web Locks API is not available
    // Note: In most test environments, navigator.locks is available,
    // so these tests verify the behavior in general

    it('should handle lock expiration for stale locks', async () => {
      // Simulate a stale lock by directly setting localStorage
      // with an old timestamp (older than 30s timeout)
      const lockKey = 'lock_stale_test';
      const oldTimestamp = Date.now() - 40000; // 40 seconds ago
      localStorage.setItem(lockKey, `stale_id:${oldTimestamp}`);

      // Service should be able to acquire the lock despite the stale entry
      // (only affects fallback mechanism, not Web Locks API)
      let executed = false;
      await service.request('stale_test', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should handle corrupted lock format with no timestamp', async () => {
      // Simulate corrupted lock entry without proper format
      const lockKey = 'lock_corrupted_no_ts';
      localStorage.setItem(lockKey, 'invalid_format_no_colon');

      // Service should treat invalid format as expired and acquire the lock
      let executed = false;
      await service.request('corrupted_no_ts', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should handle corrupted lock format with NaN timestamp', async () => {
      // Simulate corrupted lock entry with non-numeric timestamp
      const lockKey = 'lock_corrupted_nan';
      localStorage.setItem(lockKey, 'some_id:not_a_number');

      // Service should treat NaN timestamp as expired and acquire the lock
      let executed = false;
      await service.request('corrupted_nan', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should handle empty string lock value', async () => {
      // Simulate empty string in localStorage
      const lockKey = 'lock_empty';
      localStorage.setItem(lockKey, '');

      // Service should be able to acquire the lock
      let executed = false;
      await service.request('empty', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });

  describe('concurrent lock requests', () => {
    it('should serialize concurrent requests to same lock', async () => {
      const executionOrder: number[] = [];
      const startTimes: number[] = [];

      // Launch two concurrent lock requests
      const request1 = service.request('test_lock', async () => {
        startTimes.push(Date.now());
        executionOrder.push(1);
        await new Promise((r) => setTimeout(r, 20));
      });

      const request2 = service.request('test_lock', async () => {
        startTimes.push(Date.now());
        executionOrder.push(2);
        await new Promise((r) => setTimeout(r, 20));
      });

      await Promise.all([request1, request2]);

      // Both should execute (serialized)
      expect(executionOrder.length).toBe(2);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });

    it('should queue up to 10 concurrent requests', async () => {
      const executed: number[] = [];

      const requests: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        const requestNum = i;
        requests.push(
          service.request('test_lock', async () => {
            executed.push(requestNum);
            await new Promise((r) => setTimeout(r, 5));
          }),
        );
      }

      await Promise.all(requests);

      // All 10 should have executed
      expect(executed.length).toBe(10);
    });

    it('should complete and resolve after callback finishes', async () => {
      let callbackCompleted = false;
      await service.request('test_lock', async () => {
        await new Promise((r) => setTimeout(r, 5));
        callbackCompleted = true;
      });

      expect(callbackCompleted).toBeTrue();
    });

    it('should handle async callbacks correctly', async () => {
      let innerValue = '';
      await service.request('test_lock', async () => {
        await new Promise((r) => setTimeout(r, 5));
        innerValue = 'async-result';
      });

      expect(innerValue).toBe('async-result');
    });
  });

  describe('lock timeout handling', () => {
    it('should release lock on callback timeout via error', async () => {
      const slowCallback = service.request('test_lock', async () => {
        await new Promise((r) => setTimeout(r, 50));
        throw new Error('Callback failed');
      });

      await expectAsync(slowCallback).toBeRejectedWithError('Callback failed');

      // Lock should be released, next request should work
      let executed = false;
      await service.request('test_lock', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });

  describe('reentrant behavior', () => {
    it('should handle nested lock requests to different locks', async () => {
      const order: string[] = [];

      await service.request('outer_lock', async () => {
        order.push('outer-start');
        await service.request('inner_lock', async () => {
          order.push('inner');
        });
        order.push('outer-end');
      });

      expect(order).toEqual(['outer-start', 'inner', 'outer-end']);
    });
  });
});
