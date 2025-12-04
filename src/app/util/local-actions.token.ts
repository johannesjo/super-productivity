import { inject, InjectionToken } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Injection token for Actions stream filtered to local user actions only.
 *
 * Use this in effects that should NOT run for remote sync operations.
 * Remote sync operations (with meta.isRemote: true) have already executed
 * their side effects on the original client - running them again would
 * cause duplicates (snacks, work logs, notifications, etc.).
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyEffects {
 *   private _localActions$ = inject(LOCAL_ACTIONS);
 *
 *   myEffect$ = createEffect(() =>
 *     this._localActions$.pipe(
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
    return actions$.pipe(filter((action: Action) => !(action as any).meta?.isRemote));
  },
});
