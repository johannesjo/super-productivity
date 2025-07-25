import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  hideAddTaskBar,
  hideIssuePanel,
  hideNonTaskSidePanelContent,
  hideSideNav,
  hideTaskViewCustomizerPanel,
  showAddTaskBar,
  toggleAddTaskBar,
  toggleIssuePanel,
  toggleShowNotes,
  toggleSideNav,
  toggleTaskViewCustomizerPanel,
} from './store/layout.actions';
import { merge, Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import {
  LayoutState,
  selectIsShowAddTaskBar,
  selectIsShowIssuePanel,
  selectIsShowNotes,
  selectIsShowSideNav,
  selectIsShowTaskViewCustomizerPanel,
} from './store/layout.reducer';
import { filter, map, startWith } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { selectMiscConfig } from '../../features/config/store/global-config.reducer';
import { toSignal } from '@angular/core/rxjs-interop';

const NAV_ALWAYS_VISIBLE = 1200;
const NAV_OVER_RIGHT_PANEL_NEXT = 800;
const BOTH_OVER = 720;
const VERY_BIG_SCREEN = 1270;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private _store$ = inject<Store<LayoutState>>(Store);
  private _router = inject(Router);
  private _workContextService = inject(WorkContextService);
  private _breakPointObserver = inject(BreakpointObserver);

  // Observable versions (needed for shepherd)
  readonly isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowAddTaskBar),
  );
  readonly isShowSideNav$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowSideNav),
  );
  readonly isShowIssuePanel$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowIssuePanel),
  );

  readonly selectedTimeView = signal<'week' | 'month'>('week');
  readonly isScrolled = signal<boolean>(false);
  readonly isShowAddTaskBar = toSignal(this.isShowAddTaskBar$, { initialValue: false });

  readonly isNavAlwaysVisible = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${NAV_ALWAYS_VISIBLE}px)`])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly isRightPanelNextNavOver = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${NAV_OVER_RIGHT_PANEL_NEXT}px)`])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly isRightPanelOver = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${BOTH_OVER}px)`])
      .pipe(map((result) => !result.matches)),
    { initialValue: false },
  );

  // Signals for custom right panel behavior
  private readonly _isVeryBigScreen = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${VERY_BIG_SCREEN}px)`])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  private readonly _isWorkViewRoute = toSignal(
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this._isWorkViewUrl(event.urlAfterRedirects)),
      startWith(this._isWorkViewUrl(this._router.url)),
    ),
    { initialValue: this._isWorkViewUrl(this._router.url) },
  );

  // Computed signal for custom right panel over behavior
  readonly isRightPanelOverCustom = computed(() => {
    const isWorkView = this._isWorkViewRoute();
    const isVeryBigScreen = this._isVeryBigScreen();
    const defaultIsOver = this.isRightPanelOver();

    // Use default behavior if on work view
    if (isWorkView) {
      return defaultIsOver;
    }

    // For non-work-view routes: use "over" mode unless on very big screen
    return !isVeryBigScreen;
  });

  private _isWorkViewUrl(url: string): boolean {
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  }

  // Convert misc config to signal
  private readonly _miscConfig = toSignal(this._store$.select(selectMiscConfig), {
    initialValue: undefined,
  });

  // Computed signal for nav over state
  readonly isNavOver = computed(() => {
    const miscCfg = this._miscConfig();
    if (miscCfg?.isUseMinimalNav) {
      return false;
    }
    return !this.isRightPanelNextNavOver();
  });

  private readonly _isShowSideNav = toSignal(this.isShowSideNav$, {
    initialValue: false,
  });

  readonly isShowSideNav = computed(() => {
    const isShow = this._isShowSideNav();
    return isShow || this.isNavAlwaysVisible();
  });

  readonly isShowNotes = toSignal(this._store$.pipe(select(selectIsShowNotes)), {
    initialValue: false,
  });

  readonly isShowTaskViewCustomizerPanel = toSignal(
    this._store$.pipe(select(selectIsShowTaskViewCustomizerPanel)),
    { initialValue: false },
  );

  readonly isShowIssuePanel = toSignal(this.isShowIssuePanel$, { initialValue: false });

  // Signal to track navigation events
  private readonly _navigationEvents = toSignal(
    merge(
      this._router.events.pipe(filter((ev) => ev instanceof NavigationStart)),
      this._workContextService.onWorkContextChange$,
    ),
    { initialValue: null },
  );

  // Effect to handle nav hiding
  private _navHideEffect = effect(
    () => {
      const navEvent = this._navigationEvents();
      const isNavOver = this.isNavOver();
      const isShowSideNav = this._isShowSideNav();

      if (navEvent && isNavOver && isShowSideNav) {
        // Use setTimeout to avoid state changes during effect execution
        setTimeout(() => this.hideSideNav(), 0);
      }
    },
    { allowSignalWrites: true },
  );

  showAddTaskBar(): void {
    this._store$.dispatch(showAddTaskBar());
  }

  hideAddTaskBar(): void {
    this._store$.dispatch(hideAddTaskBar());
  }

  toggleAddTaskBar(): void {
    this._store$.dispatch(toggleAddTaskBar());
  }

  toggleSideNav(): void {
    this._store$.dispatch(toggleSideNav());
  }

  hideSideNav(): void {
    this._store$.dispatch(hideSideNav());
  }

  toggleNotes(): void {
    this._store$.dispatch(toggleShowNotes());
  }

  hideNotes(): void {
    this._store$.dispatch(hideNonTaskSidePanelContent());
  }

  toggleAddTaskPanel(): void {
    this._store$.dispatch(toggleIssuePanel());
  }

  hideAddTaskPanel(): void {
    this._store$.dispatch(hideIssuePanel());
  }

  toggleTaskViewCustomizerPanel(): void {
    this._store$.dispatch(toggleTaskViewCustomizerPanel());
  }

  hideTaskViewCustomizerPanel(): void {
    this._store$.dispatch(hideTaskViewCustomizerPanel());
  }
}
