import { inject, InjectionToken } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, share } from 'rxjs/operators';

/**
 * DEFAULT: Injection token for Actions stream filtered to local user actions only.
 *
 * This should be used by ALL effects as the standard replacement for `inject(LOCAL_ACTIONS)`.
 *
 * Why? When actions come from remote sync or hydration:
 * - Reducers should run (to update state) ✓
 * - Effects should NOT run because:
 *   1. UI side effects (snacks, sounds) already happened on original client
 *   2. Cascading actions are already in the operation log as separate entries
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyEffects {
 *   private _actions$ = inject(LOCAL_ACTIONS); // Use this as default
 *
 *   myEffect$ = createEffect(() =>
 *     this._actions$.pipe(
 *       ofType(SomeAction),
 *       // This effect only runs for local user actions
 *     )
 *   );
 * }
 * ```
 */
export const LOCAL_ACTIONS = new InjectionToken<Observable<Action>>('LOCAL_ACTIONS', {
  providedIn: 'root',
  factory: () => {
    const actions$ = inject(Actions);
    return actions$.pipe(
      filter((action: Action) => !(action as any).meta?.isRemote),
      share(),
    );
  },
});

/**
 * SPECIAL CASE: Unfiltered Actions stream including remote sync operations.
 *
 * Only use this for effects that MUST react to remote operations:
 * - operation-log.effects.ts: Captures and persists all actions (handles isRemote internally)
 * - archive.effects.ts: Deterministic archive handling across devices
 *
 * For all other effects, use LOCAL_ACTIONS instead.
 */
export const ALL_ACTIONS = new InjectionToken<Observable<Action>>('ALL_ACTIONS', {
  providedIn: 'root',
  factory: () => inject(Actions),
});
