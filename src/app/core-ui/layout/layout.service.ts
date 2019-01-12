import { Injectable } from '@angular/core';
import {
  HideAddTaskBar,
  HideBookmarkBar,
  ShowAddTaskBar,
  ShowBookmarkBar,
  ToggleAddTaskBar,
  ToggleBookmarkBar
} from './store/layout.actions';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { LayoutState, selectIsShowAddTaskBar, selectIsShowBookmarkBar } from './store/layout.reducer';

@Injectable()
export class LayoutService {
  isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowAddTaskBar));
  xxxxisShowBookmarkBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowBookmarkBar));

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


  showBookmarkBar() {
    this._store$.dispatch(new ShowBookmarkBar());
  }

  hideBookmarkBar() {
    this._store$.dispatch(new HideBookmarkBar());
  }

  toggleBookmarkBar() {
    this._store$.dispatch(new ToggleBookmarkBar());
  }
}
