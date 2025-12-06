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
});
