import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectIsFocusOverlayShown } from './store/focus-mode.selectors';
import { hideFocusOverlay, showFocusOverlay } from './store/focus-mode.actions';

// NOTE: we only use this service for the outside stuff for consistency, but module internally we use store directly
@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _store = inject(Store);

  isShowFocusOverlay$: Observable<boolean> = this._store.select(
    selectIsFocusOverlayShown,
  );

  showFocusOverlay(): void {
    this._store.dispatch(showFocusOverlay());
  }

  hideFocusOverlay(): void {
    this._store.dispatch(hideFocusOverlay());
  }
}
