import { InjectionToken } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

/**
 * Bridges a Capacitor `appUrlOpen` URL that is not a task action from the
 * single native listener in `main.ts` to `OAuthCallbackHandlerService`.
 *
 * There can only be one native listener for this event. `@capacitor/app`
 * emits a cold-start URL with `retainUntilConsumed: true`, and Capacitor
 * drains *and clears* the retained arguments when the **first** listener for
 * an event is added (`CAPPlugin.m`, `addEventListener` →
 * `sendRetainedArgumentsForEvent`). Any listener registered after that never
 * sees the cold-start URL, so a second consumer silently lost every URL
 * delivered by a launch. Routing one native listener to both consumers is
 * what keeps cold-start OAuth callbacks and task actions working.
 *
 * `ReplaySubject(1)` because this service only exists once Angular has
 * bootstrapped, which is after the URL has already arrived on a cold launch.
 */
export const pendingCapacitorOAuthUrl$ = new ReplaySubject<string>(1);

/**
 * Injected by OAuthCallbackHandlerService instead of importing the singleton
 * above directly, so tests can provide a fresh stream per test (the real
 * singleton persists for the app's lifetime and would otherwise replay a
 * previous test's URL into every subsequent test).
 */
export const PENDING_CAPACITOR_OAUTH_URL = new InjectionToken<Observable<string>>(
  'PENDING_CAPACITOR_OAUTH_URL',
  {
    providedIn: 'root',
    factory: () => pendingCapacitorOAuthUrl$,
  },
);
