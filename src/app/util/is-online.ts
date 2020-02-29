import {fromEvent, merge, of} from 'rxjs';
import {mapTo} from 'rxjs/operators';

export const isOnline = () => navigator.onLine !== false;

export const isOnline$ = merge(
  fromEvent(window, 'offline').pipe(mapTo(false)),
  fromEvent(window, 'online').pipe(mapTo(true)),
  of(navigator.onLine)
);
