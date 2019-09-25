import {Injectable} from '@angular/core';
import {
  hideAddTaskBar,
  hideNotes,
  hideSideNav,
  showAddTaskBar,
  toggleAddTaskBar,
  toggleShowNotes,
  toggleSideNav
} from './store/layout.actions';
import {merge, Observable, of} from 'rxjs';
import {select, Store} from '@ngrx/store';
import {LayoutState, selectIsShowAddTaskBar, selectIsShowNotes, selectIsShowSideNav} from './store/layout.reducer';
import {filter, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {BreakpointObserver} from '@angular/cdk/layout';
import {NoteService} from '../../features/note/note.service';
import {ActivatedRoute, NavigationStart, Router} from '@angular/router';
import {ProjectService} from '../../features/project/project.service';

const BOTH__ALWAYS_VISIBLE = 1400;
const NAV_ALWAYS_VISIBLE = 1050;
const NAV_NEXT_NOTES_OVER = 900;
const BOTH_OVER = 726;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {

  private _isShowSideNav$: Observable<boolean> = this._store$.pipe(select(selectIsShowSideNav));
  private _isShowNotes$: Observable<boolean> = this._store$.pipe(select(selectIsShowNotes));

  isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(select(selectIsShowAddTaskBar));

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

  isShowSideNav$: Observable<boolean> = this._isShowSideNav$.pipe(
    switchMap((isShow) => {
      return isShow
        ? of(isShow)
        : this.isNavAlwaysVisible$;
    }),
  );

  isNavOver$: Observable<boolean> = this.isBothOver$.pipe(map(v => !v));


  isShowNotes$: Observable<boolean> = this._isShowNotes$.pipe(
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
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _projectService: ProjectService,
    private _breakPointObserver: BreakpointObserver,
  ) {
    this.isNavOver$.pipe(
      filter(v => v),
      switchMap(() => merge(
        this._router.events.pipe(
          filter((ev) => ev instanceof NavigationStart)
        ),
        this._projectService.onProjectChange$
      ).pipe(
        withLatestFrom(this._isShowSideNav$),
        filter(([, isShowSideNav]) => isShowSideNav),
      ))
    ).subscribe(() => {
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
