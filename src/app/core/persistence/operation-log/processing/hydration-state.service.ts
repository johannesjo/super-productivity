import { Injectable, signal } from '@angular/core';

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
   */
  startApplyingRemoteOps(): void {
    this._isApplyingRemoteOps.set(true);
  }

  /**
   * Marks the end of remote operation application.
   * Called by OperationApplierService after applying operations.
   */
  endApplyingRemoteOps(): void {
    this._isApplyingRemoteOps.set(false);
  }
}
