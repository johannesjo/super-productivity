import { Injectable } from '@angular/core';
import { LOCK_ACQUIRE_TIMEOUT_MS, LOCK_TIMEOUT_MS } from './operation-log.const';

/**
 * Provides a cross-tab and cross-process locking mechanism for critical operations.
 * It uses the Web Locks API (`navigator.locks`) for modern browsers and a robust
 * `localStorage` based polling fallback for environments where Web Locks are not available
 * or unreliable (e.g., older WebViews).
 * This ensures that only one tab/process modifies shared data at a time, preventing race conditions.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  async request(lockName: string, callback: () => Promise<void>): Promise<void> {
    if (navigator.locks) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return navigator.locks.request(lockName, callback);
    } else {
      // Fallback implementation using localStorage polling
      return this.acquireFallbackLock(lockName, callback);
    }
  }

  private async acquireFallbackLock(
    lockName: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    const lockKey = `lock_${lockName}`;
    const lockId = Math.random().toString(36).substring(2);

    // Try to acquire - wait up to LOCK_ACQUIRE_TIMEOUT_MS for a busy lock to be released
    const start = Date.now();
    while (Date.now() - start < LOCK_ACQUIRE_TIMEOUT_MS) {
      // Check if locked
      const currentLock = localStorage.getItem(lockKey);
      let isExpired = false;
      if (currentLock) {
        const parts = currentLock.split(':');
        if (parts.length === 2) {
          const ts = parseInt(parts[1], 10);
          if (Date.now() - ts > LOCK_TIMEOUT_MS) {
            isExpired = true;
          }
        }
      }

      if (!currentLock || isExpired) {
        // Try to write
        const newVal = `${lockId}:${Date.now()}`;
        localStorage.setItem(lockKey, newVal);
        // Verify (yield to other tabs)
        await new Promise((r) => setTimeout(r, 10));
        if (localStorage.getItem(lockKey) === newVal) {
          // Acquired
          try {
            await callback();
          } finally {
            // Only release if we still hold it
            if (localStorage.getItem(lockKey) === newVal) {
              localStorage.removeItem(lockKey);
            }
          }
          return;
        }
      }
      // Wait random time
      const randomDelay = Math.random() * 100;
      await new Promise((r) => setTimeout(r, 50 + randomDelay));
    }
    throw new Error(
      `Could not acquire lock ${lockName} after ${LOCK_ACQUIRE_TIMEOUT_MS / 1000}s`,
    );
  }
}
