import { Injectable } from '@angular/core';
import { HideAddTaskBar, ShowAddTaskBar, ToggleAddTaskBar } from './store/layout.actions';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { LayoutState, selectIsShowAddTaskBar } from './store/layout.reducer';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowAddTaskBar));

  constructor(private _store$: Store<LayoutState>) {
  }

  showAddTaskBar() {
    this._store$.dispatch(new ShowAddTaskBar());
  }

  hideAddTaskBar() {
    this._store$.dispatch(new HideAddTaskBar());
  }

  toggleAddTaskBar() {
    this._store$.dispatch(new ToggleAddTaskBar());
  }
}
