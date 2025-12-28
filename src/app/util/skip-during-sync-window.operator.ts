import { inject } from '@angular/core';
import { MonoTypeOperatorFunction } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HydrationStateService } from '../op-log/apply/hydration-state.service';

/**
 * RxJS operator that skips emissions during the full sync window,
 * including the post-sync cooldown period.
 *
 * ## Why This Exists
 *
 * `skipWhileApplyingRemoteOps()` only blocks during `isApplyingRemoteOps()` - the window
 * when operations are being applied to the store. However, there's a timing gap:
 *
 * 1. Tab gains focus → sync triggers
 * 2. Remote ops applied (isApplyingRemoteOps = true)
 * 3. Sync finishes, isApplyingRemoteOps = false
 * 4. Selectors immediately re-evaluate with new state
 * 5. Effects fire and create operations that conflict with just-synced state
 *
 * This operator extends the suppression window to include a cooldown period
 * after sync, preventing step 5.
 *
 * ## When to Use
 *
 * Use this operator instead of `skipWhileApplyingRemoteOps()` for selector-based effects that:
 * - Modify frequently-synced entities (TODAY_TAG, etc.)
 * - Perform "repair" or "consistency" operations
 * - Could create operations that immediately conflict with remote changes
 *
 * ## Usage
 *
 * ```typescript
 * import { skipDuringSyncWindow } from '../../../util/skip-during-sync-window.operator';
 *
 * @Injectable()
 * export class MyEffects {
 *   repairEffect$ = createEffect(() =>
 *     this.store.select(mySelector).pipe(
 *       skipDuringSyncWindow(),  // Extended suppression window
 *       // ... effect logic
 *     )
 *   );
 * }
 * ```
 *
 * ## Comparison with skipWhileApplyingRemoteOps()
 *
 * | Operator | Suppresses during | Use case |
 * |----------|-------------------|----------|
 * | skipWhileApplyingRemoteOps() | isApplyingRemoteOps only | General selector-based effects |
 * | skipDuringSyncWindow() | isApplyingRemoteOps + cooldown | Effects that modify shared entities |
 */
export const skipDuringSyncWindow = <T>(): MonoTypeOperatorFunction<T> => {
  const hydrationState = inject(HydrationStateService);
  return filter(() => !hydrationState.isInSyncWindow());
};
