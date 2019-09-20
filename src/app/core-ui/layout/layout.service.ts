import {Injectable} from '@angular/core';
import {HideAddTaskBar, ShowAddTaskBar, ToggleAddTaskBar, ToggleSideBar,} from './store/layout.actions';
import {Observable, of} from 'rxjs';
import {select, Store} from '@ngrx/store';
import {LayoutState, selectIsShowAddTaskBar, selectIsShowSideBar} from './store/layout.reducer';
import {map, switchMap} from 'rxjs/operators';
import {BreakpointObserver} from '@angular/cdk/layout';
import {NoteService} from '../../features/note/note.service';

const BOTH__ALWAYS_VISIBLE = 1400;
const NAV_ALWAYS_VISIBLE = 1050;
const NAV_NEXT_NOTES_OVER = 900;
const BOTH_OVER = 726;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowAddTaskBar));
  private _isShowSideBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowSideBar));

  isBothAlwaysVisible$: Observable<boolean> = this._breakPointObserver.observe([
    `(min-width: ${BOTH__ALWAYS_VISIBLE}px)`,
  ]).pipe(map(result => result.matches));
  isNavAlwaysVisible$: Observable<boolean> = this._breakPointObserver.observe([
    `(min-width: ${NAV_ALWAYS_VISIBLE}px)`,
  ]).pipe(map(result => result.matches));
  isNavNextNotesOver$: Observable<boolean> = this._breakPointObserver.observe([
    `(min-width: ${NAV_NEXT_NOTES_OVER}px)`,
  ]).pipe(map(result => result.matches));
  isBothOver$: Observable<boolean> = this._breakPointObserver.observe([
    `(min-width: ${BOTH_OVER}px)`,
  ]).pipe(map(result => result.matches));

  isShowNav$: Observable<boolean> = this._isShowSideBar$.pipe(
    switchMap((isShow) => {
      return isShow
        ? of(isShow)
        : this.isNavAlwaysVisible$;
    }),
  );

  isNavOver$: Observable<boolean> = this.isBothOver$.pipe(map(v => !v));

  isShowNotes$: Observable<boolean> = this._noteService.isShowNotes$.pipe(
    switchMap((isShow) => {
      return isShow
        ? of(isShow)
        : this.isBothAlwaysVisible$;
    }),
  );

  isNotesOver$: Observable<boolean> = this.isNavNextNotesOver$.pipe(map(v => !v));


  constructor(
    private _store$: Store<LayoutState>,
    private _noteService: NoteService,
    private _breakPointObserver: BreakpointObserver,
  ) {
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

  toggleSidebar() {
    this._store$.dispatch(new ToggleSideBar());
  }
}
