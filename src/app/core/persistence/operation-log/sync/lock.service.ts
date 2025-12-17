import { Injectable } from '@angular/core';
import { Log } from '../../../log';

/**
 * Provides a cross-tab locking mechanism for critical operations using the Web Locks API.
 * Web Locks API has 97%+ browser support (https://caniuse.com/web-locks).
 *
 * This ensures that only one tab/process modifies shared data at a time,
 * preventing race conditions during sync operations.
 *
 * If Web Locks API is not available, the service gracefully degrades by
 * executing the callback without locking. A warning is logged once per session.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  private _hasWarnedAboutMissingLocks = false;

  async request(lockName: string, callback: () => Promise<void>): Promise<void> {
    if (!navigator.locks) {
      // Graceful degradation: execute callback without lock
      // WARNING: This can cause data corruption in multi-tab scenarios!
      // We continue to allow single-tab usage in older browsers.
      if (!this._hasWarnedAboutMissingLocks) {
        Log.error(
          '[LockService] Web Locks API not available. Using multiple tabs may cause DATA LOSS. ' +
            'Please upgrade your browser or use only ONE tab at a time.',
        );
        this._hasWarnedAboutMissingLocks = true;
      }
      return callback();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return navigator.locks.request(lockName, callback);
  }
}
