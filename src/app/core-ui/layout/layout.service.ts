import { Injectable } from '@angular/core';
import {
  hideAddTaskBar,
  hideNotes,
  hideSearchBar,
  hideSideNav,
  showAddTaskBar,
  showSearchBar,
  toggleAddTaskBar,
  toggleSearchBar,
  toggleShowNotes,
  toggleSideNav,
} from './store/layout.actions';
import { BehaviorSubject, EMPTY, merge, Observable, of } from 'rxjs';
import { select, Store } from '@ngrx/store';
import {
  LayoutState,
  selectIsShowAddTaskBar,
  selectIsShowSearchBar,
  selectIsShowSideNav,
} from './store/layout.reducer';
import { filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationStart, Router } from '@angular/router';
import { WorkContextService } from '../../features/work-context/work-context.service';

const NAV_ALWAYS_VISIBLE = 1250;
const NAV_OVER_NOTES_NEXT = 800;
const BOTH_OVER = 720;
const XS_MAX = 599;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  isScreenXs$: Observable<boolean> = this._breakPointObserver
    .observe([`(max-width: ${XS_MAX}px)`])
    .pipe(map((result) => result.matches));

  isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowAddTaskBar),
  );
  isShowSearchBar$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowSearchBar),
  );
  isNavAlwaysVisible$: Observable<boolean> = this._breakPointObserver
    .observe([`(min-width: ${NAV_ALWAYS_VISIBLE}px)`])
    .pipe(map((result) => result.matches));
  isNotesNextNavOver$: Observable<boolean> = this._breakPointObserver
    .observe([`(min-width: ${NAV_OVER_NOTES_NEXT}px)`])
    .pipe(map((result) => result.matches));
  isNotesOver$: Observable<boolean> = this._breakPointObserver
    .observe([`(min-width: ${BOTH_OVER}px)`])
    .pipe(map((result) => !result.matches));
  isNavOver$: Observable<boolean> = this.isNotesNextNavOver$.pipe(map((v) => !v));
  isScrolled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _isShowSideNav$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowSideNav),
  );
  isShowSideNav$: Observable<boolean> = this._isShowSideNav$.pipe(
    switchMap((isShow) => {
      return isShow ? of(isShow) : this.isNavAlwaysVisible$;
    }),
  );

  // isShowNotes$: Observable<boolean> = this._isShowNotes$.pipe(
  //   switchMap((isShow) => {
  //     return isShow
  //       ? of(isShow)
  //       : this.isBothAlwaysVisible$;
  //   }),
  // );
  // private _isShowNotes$: Observable<boolean> = this._store$.pipe(select(selectIsShowNotes));

  constructor(
    private _store$: Store<LayoutState>,
    private _router: Router,
    private _workContextService: WorkContextService,
    private _breakPointObserver: BreakpointObserver,
  ) {
    this.isNavOver$
      .pipe(
        switchMap((isNavOver) =>
          isNavOver
            ? merge(
                this._router.events.pipe(filter((ev) => ev instanceof NavigationStart)),
                this._workContextService.onWorkContextChange$,
              ).pipe(
                withLatestFrom(this._isShowSideNav$),
                filter(([, isShowSideNav]) => isShowSideNav),
              )
            : EMPTY,
        ),
      )
      .subscribe(() => {
        this.hideSideNav();
      });
  }

  showAddTaskBar() {
    this._store$.dispatch(showAddTaskBar());
  }

  hideAddTaskBar() {
    this._store$.dispatch(hideAddTaskBar());
  }

  toggleAddTaskBar() {
    this._store$.dispatch(toggleAddTaskBar());
  }

  showSearchBar() {
    this._store$.dispatch(showSearchBar());
  }

  hideSearchBar() {
    this._store$.dispatch(hideSearchBar());
  }

  toggleSearchBar() {
    this._store$.dispatch(toggleSearchBar());
  }

  toggleSideNav() {
    this._store$.dispatch(toggleSideNav());
  }

  hideSideNav() {
    this._store$.dispatch(hideSideNav());
  }

  public toggleNotes() {
    this._store$.dispatch(toggleShowNotes());
  }

  public hideNotes() {
    this._store$.dispatch(hideNotes());
  }
}
