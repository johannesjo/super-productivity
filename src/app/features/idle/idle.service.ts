import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectIdleTime, selectIsIdle } from './store/idle.selectors';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  private _store = inject(Store);

  private _isIdle$: Observable<boolean> = this._store.select(selectIsIdle);
  isIdle$: Observable<boolean> = this._isIdle$.pipe(
    distinctUntilChanged(),
    shareReplay(1),
  );
  idleTime$: Observable<number> = this._store.select(selectIdleTime);
}
