import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import {
  setFocusSessionActivePage,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';
import { Store } from '@ngrx/store';
import { interval, Observable, Subject } from 'rxjs';
import { delay, map, startWith, takeUntil, takeWhile } from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { T } from 'src/app/t.const';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

const COUNTDOWN_DURATION = 5;

@Component({
  selector: 'focus-mode-preparation',
  templateUrl: './focus-mode-preparation.component.html',
  styleUrls: ['./focus-mode-preparation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [AsyncPipe, TranslatePipe],
})
export class FocusModePreparationComponent implements OnDestroy {
  private readonly _store = inject(Store);

  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  countdown$: Observable<number> = interval(1000).pipe(
    takeUntil(this._onDestroy$),
    takeWhile((value) => value <= COUNTDOWN_DURATION),
    map((v) => COUNTDOWN_DURATION - 1 - v),
    startWith(COUNTDOWN_DURATION),
  );

  constructor() {
    this.countdown$.pipe(delay(1000), takeUntil(this._onDestroy$)).subscribe((v) => {
      if (v <= 0) {
        this.startSession();
      }
    });
  }

  startSession(): void {
    this._store.dispatch(startFocusSession());
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
    );
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }
}
