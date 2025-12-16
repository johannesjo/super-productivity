import { Injectable } from '@angular/core';

/**
 * Provides a cross-tab locking mechanism for critical operations using the Web Locks API.
 * Web Locks API has 97%+ browser support (https://caniuse.com/web-locks).
 *
 * This ensures that only one tab/process modifies shared data at a time,
 * preventing race conditions during sync operations.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  async request(lockName: string, callback: () => Promise<void>): Promise<void> {
    if (!navigator.locks) {
      throw new Error(
        'Web Locks API not available. This browser does not support cross-tab synchronization.',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return navigator.locks.request(lockName, callback);
  }
}
