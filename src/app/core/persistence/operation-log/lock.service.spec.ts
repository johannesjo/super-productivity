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
    Object.keys(localStorage)
      .filter((key) => key.startsWith('lock_'))
      .forEach((key) => localStorage.removeItem(key));
  });

  afterEach(() => {
    // Clean up locks
    Object.keys(localStorage)
      .filter((key) => key.startsWith('lock_'))
      .forEach((key) => localStorage.removeItem(key));
  });

  describe('request', () => {
    it('should execute callback successfully', async () => {
      let executed = false;
      await service.request('testLock', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should return callback result', async () => {
      const result = await service.request('testLock', async () => {
        return Promise.resolve();
      });
      expect(result).toBeUndefined();
    });

    it('should release lock after callback completes', async () => {
      await service.request('testLock', async () => {
        // Do nothing
      });

      // Should be able to acquire again immediately
      let secondExecuted = false;
      await service.request('testLock', async () => {
        secondExecuted = true;
      });
      expect(secondExecuted).toBe(true);
    });

    it('should release lock even if callback throws', async () => {
      try {
        await service.request('testLock', async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected
      }

      // Should be able to acquire again
      let secondExecuted = false;
      await service.request('testLock', async () => {
        secondExecuted = true;
      });
      expect(secondExecuted).toBe(true);
    });

    it('should allow different lock names to be acquired concurrently', async () => {
      const results: string[] = [];

      await Promise.all([
        service.request('lock1', async () => {
          results.push('lock1');
        }),
        service.request('lock2', async () => {
          results.push('lock2');
        }),
      ]);

      expect(results).toContain('lock1');
      expect(results).toContain('lock2');
    });
  });

  describe('fallback lock behavior', () => {
    let originalLocks: LockManager | undefined;

    beforeEach(() => {
      // Save original locks
      originalLocks = navigator.locks;
      // Remove Web Locks API to test fallback
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // Restore Web Locks API
      Object.defineProperty(navigator, 'locks', {
        value: originalLocks,
        writable: true,
        configurable: true,
      });
    });

    it('should use localStorage fallback when Web Locks unavailable', async () => {
      let executed = false;
      await service.request('fallbackTest', async () => {
        executed = true;
        // Check that localStorage has the lock
        const lockKey = 'lock_fallbackTest';
        const lockValue = localStorage.getItem(lockKey);
        expect(lockValue).toBeTruthy();
      });
      expect(executed).toBe(true);
    });

    it('should clean up localStorage lock after completion', async () => {
      await service.request('fallbackTest', async () => {
        // Do nothing
      });

      const lockKey = 'lock_fallbackTest';
      const lockValue = localStorage.getItem(lockKey);
      expect(lockValue).toBeNull();
    });

    it('should clean up localStorage lock after error', async () => {
      try {
        await service.request('fallbackTest', async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected
      }

      const lockKey = 'lock_fallbackTest';
      const lockValue = localStorage.getItem(lockKey);
      expect(lockValue).toBeNull();
    });

    it('should expire stale locks', async () => {
      // Set an old lock manually
      const lockKey = 'lock_staleTest';
      const oldTimestamp = Date.now() - 10000; // 10 seconds old
      localStorage.setItem(lockKey, `oldLockId:${oldTimestamp}`);

      // Should be able to acquire despite the old lock
      let executed = false;
      await service.request('staleTest', async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });
});
