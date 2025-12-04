import { Injectable } from '@angular/core';
import { LOCK_ACQUIRE_TIMEOUT_MS, LOCK_TIMEOUT_MS } from '../operation-log.const';

/**
 * Provides a cross-tab and cross-process locking mechanism for critical operations.
 * It uses the Web Locks API (`navigator.locks`) for modern browsers and a robust
 * `localStorage` based two-phase commit fallback for environments where Web Locks
 * are not available or unreliable (e.g., older WebViews).
 * This ensures that only one tab/process modifies shared data at a time, preventing race conditions.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  async request(lockName: string, callback: () => Promise<void>): Promise<void> {
    if (navigator.locks) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return navigator.locks.request(lockName, callback);
    } else {
      // Fallback implementation using localStorage with two-phase commit
      return this.acquireFallbackLock(lockName, callback);
    }
  }

  /**
   * Two-phase commit lock acquisition using localStorage.
   * Phase 1: Write pending lock with unique ID
   * Phase 2: After delay, verify we still hold the pending lock
   * This prevents race conditions from cache coherency delays across tabs.
   */
  private async acquireFallbackLock(
    lockName: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    const lockKey = `lock_${lockName}`;
    const lockId = Math.random().toString(36).substring(2);
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < LOCK_ACQUIRE_TIMEOUT_MS) {
      // Check if lock is available or expired
      const currentLock = localStorage.getItem(lockKey);
      let canAcquire = false;

      if (currentLock) {
        const parts = currentLock.split(':');
        if (parts.length >= 2) {
          const ts = parseInt(parts[parts.length - 1], 10);
          if (Date.now() - ts > LOCK_TIMEOUT_MS) {
            canAcquire = true; // Lock expired
          }
        }
      } else {
        canAcquire = true; // No lock
      }

      if (canAcquire) {
        // Phase 1: Write pending lock with unique marker
        const pendingVal = `pending_${lockId}:${Date.now()}`;
        localStorage.setItem(lockKey, pendingVal);

        // Wait for storage events to settle across tabs
        // 50ms is long enough to handle most cache coherency delays
        await new Promise((r) => setTimeout(r, 50));

        // Phase 2: Verify we still own the pending lock
        if (localStorage.getItem(lockKey) === pendingVal) {
          // Upgrade to confirmed lock
          const confirmedVal = `${lockId}:${Date.now()}`;
          localStorage.setItem(lockKey, confirmedVal);

          // Final verification after another short delay
          await new Promise((r) => setTimeout(r, 20));
          if (localStorage.getItem(lockKey) === confirmedVal) {
            // Successfully acquired lock
            try {
              await callback();
            } finally {
              // Only release if we still hold it
              if (localStorage.getItem(lockKey) === confirmedVal) {
                localStorage.removeItem(lockKey);
              }
            }
            return;
          }
        }
        // Another tab beat us to it, fall through to retry
      }

      // Exponential backoff with jitter to reduce contention
      attempt++;
      const baseDelay = Math.min(1000, 50 * Math.pow(2, Math.min(attempt, 5)));
      const jitter = Math.random() * baseDelay * 0.5;
      await new Promise((r) => setTimeout(r, baseDelay + jitter));
    }

    throw new Error(
      `Could not acquire lock ${lockName} after ${LOCK_ACQUIRE_TIMEOUT_MS / 1000}s`,
    );
  }
}
