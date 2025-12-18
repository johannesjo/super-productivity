import { Injectable } from '@angular/core';
import { Log } from '../../../log';

/**
 * Provides a cross-tab locking mechanism for critical operations using the Web Locks API.
 * Web Locks API has 97%+ browser support (https://caniuse.com/web-locks).
 *
 * This ensures that only one tab/process modifies shared data at a time,
 * preventing race conditions during sync operations.
 *
 * If Web Locks API is not available, the service provides a single-tab fallback
 * using Promise-based mutual exclusion. This prevents concurrent operations within
 * the same tab but cannot protect against multi-tab scenarios.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  private _hasWarnedAboutMissingLocks = false;

  // Fallback for browsers without Web Locks API - single-tab mutex
  private _fallbackLocks = new Map<string, Promise<void>>();

  async request(lockName: string, callback: () => Promise<void>): Promise<void> {
    if (!navigator.locks) {
      // Fallback: Use Promise-based mutex for single-tab protection.
      // WARNING: This does NOT protect against multi-tab data corruption!
      if (!this._hasWarnedAboutMissingLocks) {
        Log.error(
          '[LockService] Web Locks API not available. Using multiple tabs may cause DATA LOSS. ' +
            'Please upgrade your browser or use only ONE tab at a time.',
        );
        this._hasWarnedAboutMissingLocks = true;
      }
      Log.warn(
        '[LockService] Delaying action cause of lock and executing fallback request.',
      );
      return this._fallbackRequest(lockName, callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return navigator.locks.request(lockName, callback);
  }

  /**
   * Single-tab fallback mutex using Promise chaining.
   * Each request waits for the previous one to complete before executing.
   */
  private async _fallbackRequest(
    lockName: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    // Wait for any existing lock to be released
    const existingLock = this._fallbackLocks.get(lockName);

    // Create a new lock that resolves after we're done
    let releaseLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this._fallbackLocks.set(lockName, newLock);

    try {
      // Wait for previous lock holder
      if (existingLock) {
        await existingLock;
      }
      // Execute the callback
      await callback();
    } finally {
      // Release the lock
      releaseLock!();
      // Clean up if we're the last one
      if (this._fallbackLocks.get(lockName) === newLock) {
        this._fallbackLocks.delete(lockName);
      }
    }
  }
}
