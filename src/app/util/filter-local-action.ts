import { filter, OperatorFunction } from 'rxjs';
import { Action } from '@ngrx/store';

/**
 * Action with optional persistence metadata.
 * Remote actions have meta.isRemote = true.
 */
interface ActionWithMeta extends Action {
  meta?: {
    isRemote?: boolean;
  };
}

/**
 * RxJS operator that filters out remote actions from sync.
 *
 * Use this in effects that should only run for local user actions,
 * not for actions replayed from remote sync.
 *
 * @example
 * ```typescript
 * myEffect$ = createEffect(() =>
 *   this._actions$.pipe(
 *     ofType(TaskSharedActions.addTask),
 *     filterLocalAction(),
 *     // ... rest of effect
 *   )
 * );
 * ```
 */
export const filterLocalAction = <T extends ActionWithMeta>(): OperatorFunction<T, T> =>
  filter((action: T) => !action.meta?.isRemote);
