import { fromEvent, merge, of } from 'rxjs';
import { mapTo } from 'rxjs/operators';

export const isOnline = (): boolean => navigator.onLine !== false;

export const isOnline$ = merge(
  fromEvent(window, 'offline').pipe(mapTo(false)),
  fromEvent(window, 'online').pipe(mapTo(true)),
  of(navigator.onLine),
);

// NOTE this is not working, since we are not a singleton service
// .pipe(
// shareReplay(1),
// );
