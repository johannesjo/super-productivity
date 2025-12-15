import { computed, inject, Injectable, signal, DestroyRef } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Tracks Super Sync-specific status for the UI indicator.
 *
 * This service manages:
 * 1. When the remote server was last checked for updates
 * 2. Whether there are pending local operations to upload
 *
 * The UI uses this to show:
 * - Single checkmark: no pending ops (local synced to remote)
 * - Double checkmark: no pending ops AND remote checked recently (< 1 minute)
 */
@Injectable({
  providedIn: 'root',
})
export class SuperSyncStatusService {
  private readonly STORAGE_KEY = 'super_sync_last_remote_check';
  private readonly FRESHNESS_MS = 60_000; // 1 minute

  private _destroyRef = inject(DestroyRef);

  // Last remote check timestamp
  private _lastRemoteCheck$ = new BehaviorSubject<number>(this._loadTimestamp());
  private _lastRemoteCheck = toSignal(this._lastRemoteCheck$, { initialValue: 0 });

  // Current time (updated every second for reactive freshness check)
  private _now = signal(Date.now());

  // Has pending ops (updated after sync cycles)
  private _hasPendingOps$ = new BehaviorSubject<boolean>(true);
  private _hasPendingOps = toSignal(this._hasPendingOps$, { initialValue: true });

  // Computed: is remote check fresh (< 1 minute ago)?
  readonly isRemoteCheckFresh = computed(() => {
    const lastCheck = this._lastRemoteCheck();
    return this._now() - lastCheck < this.FRESHNESS_MS;
  });

  // Computed: fully confirmed in sync (no pending ops AND recent remote check)
  readonly isConfirmedInSync = computed(() => {
    return !this._hasPendingOps() && this.isRemoteCheckFresh();
  });

  constructor() {
    // Timer to update _now every second for reactive UI updates
    interval(1000)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._now.set(Date.now()));
  }

  /**
   * Called after successfully checking the remote server for updates.
   * This includes both cases where updates were found and where no updates were found.
   */
  markRemoteChecked(): void {
    const now = Date.now();
    localStorage.setItem(this.STORAGE_KEY, String(now));
    this._lastRemoteCheck$.next(now);
  }

  /**
   * Called after sync operations to update whether there are pending ops.
   */
  updatePendingOpsStatus(hasPending: boolean): void {
    this._hasPendingOps$.next(hasPending);
  }

  private _loadTimestamp(): number {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }
}
