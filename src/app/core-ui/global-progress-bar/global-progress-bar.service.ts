import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, of, timer } from 'rxjs';
import {
  delay,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PROGRESS_BAR_LABEL_MAP } from './global-progress-bar.const';
import { T } from '../../t.const';

const DELAY = 100;

@Injectable({ providedIn: 'root' })
export class GlobalProgressBarService {
  nrOfRequests$: BehaviorSubject<number> = new BehaviorSubject(0);
  isShowGlobalProgressBar$: Observable<boolean> = this.nrOfRequests$.pipe(
    map((nr) => nr > 0),
    distinctUntilChanged(),
    switchMap((isShow) => (isShow ? of(true) : of(false).pipe(delay(DELAY)))),
    startWith(false),
    // @see https://blog.angular-university.io/angular-debugging/
    delay(0),
  );

  // We don't want the spinner to appear forever, after 60 seconds we just assume something
  // was not counted down correctly
  private _dirtyCountdown$ = this.isShowGlobalProgressBar$.pipe(
    switchMap((isShow) => {
      return isShow
        ? timer(60 * 1000).pipe(
            tap(() => {
              console.error('Global spinner was shown forever (60s). Forcing countDown!');
              this.countDown();
            }),
          )
        : EMPTY;
    }),
  );

  private _label$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null,
  );
  label$: Observable<string | null> = this._label$.pipe(
    distinctUntilChanged(),
    switchMap((label: string | null) =>
      !!label ? of(label) : of(null).pipe(delay(DELAY)),
    ),
    // @see https://blog.angular-university.io/angular-debugging/
    delay(0),
  );

  constructor() {
    this._dirtyCountdown$.subscribe();
  }

  countUp(url: string): void {
    this.nrOfRequests$.next(this.nrOfRequests$.getValue() + 1);
    this._label$.next(this._urlToLabel(url));
  }

  countDown(): void {
    this.nrOfRequests$.next(Math.max(this.nrOfRequests$.getValue() - 1, 0));
    if (this.nrOfRequests$.getValue() - 1 <= 0) {
      this._label$.next(null);
    }
  }

  private _urlToLabel(url: string): string {
    const [urlWithoutParams]: string[] = url.split('?');

    if (PROGRESS_BAR_LABEL_MAP[url]) {
      return PROGRESS_BAR_LABEL_MAP[url];
    } else {
      const key = Object.keys(PROGRESS_BAR_LABEL_MAP).find((keyIn) =>
        urlWithoutParams.includes(keyIn),
      );
      return key ? PROGRESS_BAR_LABEL_MAP[key] : T.GPB.UNKNOWN;
    }
  }
}
