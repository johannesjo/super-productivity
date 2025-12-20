import { Injectable, signal } from '@angular/core';
import { setIsApplyingRemoteOps } from './operation-capture.meta-reducer';

/**
 * Tracks whether the application is currently applying remote operations
 * (hydration replay or sync). This allows selector-based effects to skip
 * processing during these phases.
 *
 * ## Why This Exists
 *
 * Action-based effects use `LOCAL_ACTIONS` to filter out remote operations.
 * However, selector-based effects (which subscribe to store selectors directly)
 * don't have this filtering - they fire whenever the store changes.
 *
 * During hydration/sync replay, we dispatch many actions rapidly. Without
 * suppression, selector-based effects would:
 * 1. Fire for each state change
 * 2. Create new operations (captured by OperationCaptureService)
 * 3. Cause performance issues and duplicate operations
 *
 * ## Usage
 *
 * ```typescript
 * @Injectable()
 * export class MyEffects {
 *   private hydrationState = inject(HydrationStateService);
 *
 *   mySelectorBasedEffect$ = createEffect(() =>
 *     this.store.select(mySelector).pipe(
 *       filter(() => !this.hydrationState.isApplyingRemoteOps()),
 *       // ... rest of effect
 *     )
 *   );
 * }
 * ```
 *
 * ## Preventing Stale Operations During Sync
 *
 * This service also notifies the operation capture meta-reducer to skip
 * capturing user interactions during sync. This prevents the "slow device
 * cascade" problem where user actions during sync create operations with
 * stale vector clocks that immediately conflict.
 */
@Injectable({ providedIn: 'root' })
export class HydrationStateService {
  private _isApplyingRemoteOps = signal(false);

  /**
   * Returns true if remote operations are currently being applied.
   * Use this to guard selector-based effects.
   */
  isApplyingRemoteOps(): boolean {
    return this._isApplyingRemoteOps();
  }

  /**
   * Marks the start of remote operation application.
   * Called by OperationApplierService before applying operations.
   *
   * Also notifies the meta-reducer to skip capturing local operations
   * during this time to prevent stale vector clocks.
   */
  startApplyingRemoteOps(): void {
    this._isApplyingRemoteOps.set(true);
    setIsApplyingRemoteOps(true);
  }

  /**
   * Marks the end of remote operation application.
   * Called by OperationApplierService after applying operations.
   *
   * Re-enables operation capturing for local operations.
   */
  endApplyingRemoteOps(): void {
    this._isApplyingRemoteOps.set(false);
    setIsApplyingRemoteOps(false);
  }
}
