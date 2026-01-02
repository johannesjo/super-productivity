import { fromEvent, merge, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, mapTo, shareReplay } from 'rxjs/operators';

export const isOnline = (): boolean => navigator.onLine !== false;

export const isOnline$ = merge(
  fromEvent(window, 'offline').pipe(mapTo(false)),
  fromEvent(window, 'online').pipe(mapTo(true)),
  of(navigator.onLine),
).pipe(
  // Debounce to prevent rapid oscillations from triggering repeated banner changes
  // This is especially important on Linux/Electron where navigator.onLine can be unreliable
  debounceTime(1000),
  distinctUntilChanged(),
  shareReplay(1),
);
