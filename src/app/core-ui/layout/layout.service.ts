import { computed, inject, Injectable, signal } from '@angular/core';
import {
  hideAddTaskBar,
  hideIssuePanel,
  hideNonTaskSidePanelContent,
  hideTaskViewCustomizerPanel,
  showAddTaskBar,
  toggleIssuePanel,
  toggleShowNotes,
  toggleTaskViewCustomizerPanel,
} from './store/layout.actions';
import { Observable } from 'rxjs';
import { select, Store } from '@ngrx/store';
import {
  LayoutState,
  selectIsShowAddTaskBar,
  selectIsShowIssuePanel,
  selectIsShowNotes,
  selectIsShowTaskViewCustomizerPanel,
} from './store/layout.reducer';
import { filter, map, startWith } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

const NAV_ALWAYS_VISIBLE = 600;
const RIGHT_PANEL_OVER = 720;
const VERY_BIG_SCREEN = NAV_ALWAYS_VISIBLE;
const XS_BREAKPOINT = 600;
const XS_MEDIA_QUERY = `(max-width: ${XS_BREAKPOINT}px)`;
const initialXsMatch =
  typeof window !== 'undefined' ? window.matchMedia(XS_MEDIA_QUERY).matches : false;
const XXXS_BREAKPOINT = 398;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private _store$ = inject<Store<LayoutState>>(Store);
  private _router = inject(Router);
  private _breakPointObserver = inject(BreakpointObserver);
  private _previouslyFocusedElement: HTMLElement | null = null;

  // Signal to trigger sidebar focus
  private _focusSideNavTrigger = signal(0);
  readonly focusSideNavTrigger = this._focusSideNavTrigger.asReadonly();

  // Observable versions (needed for shepherd)
  readonly isShowAddTaskBar$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowAddTaskBar),
  );
  readonly isShowIssuePanel$: Observable<boolean> = this._store$.pipe(
    select(selectIsShowIssuePanel),
  );

  readonly selectedTimeView = signal<'week' | 'month'>('week');
  readonly isScrolled = signal<boolean>(false);
  readonly isShowAddTaskBar = toSignal(this.isShowAddTaskBar$, { initialValue: false });

  readonly isMobileNav = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${NAV_ALWAYS_VISIBLE}px)`])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly isRightPanelOver = toSignal(
    this._breakPointObserver
      .observe([`(min-width: ${RIGHT_PANEL_OVER}px)`])
      .pipe(map((result) => !result.matches)),
    { initialValue: false },
  );

  readonly isXs = toSignal(
    this._breakPointObserver
      .observe(XS_MEDIA_QUERY)
      .pipe(map((result) => result.matches)),
    { initialValue: initialXsMatch },
  );

  readonly isXxxs = toSignal(
    this._breakPointObserver
      .observe(`(max-width: ${XXXS_BREAKPOINT}px)`)
      .pipe(map((result) => result.matches)),
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

  // Computed signal to determine if right panel should be in overlay mode based on route and screen size
  readonly shouldRightPanelOverlay = computed(() => {
    const isWorkView = this._isWorkViewRoute();
    const isVeryBigScreen = this._isVeryBigScreen();
    const defaultIsOver = this.isRightPanelOver();

    // For work-view routes, use default responsive behavior
    if (isWorkView) {
      return defaultIsOver;
    }

    // For non-work-view routes: always use overlay mode unless on very big screen
    return !isVeryBigScreen;
  });

  private _isWorkViewUrl(url: string): boolean {
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  }

  readonly isShowNotes = toSignal(this._store$.pipe(select(selectIsShowNotes)), {
    initialValue: false,
  });

  readonly isShowTaskViewCustomizerPanel = toSignal(
    this._store$.pipe(select(selectIsShowTaskViewCustomizerPanel)),
    { initialValue: false },
  );

  readonly isShowIssuePanel = toSignal(this.isShowIssuePanel$, { initialValue: false });

  showAddTaskBar(): void {
    // Store currently focused element if it's a task
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.id && activeElement.id.startsWith('t-')) {
      this._previouslyFocusedElement = activeElement;
    }
    this._store$.dispatch(showAddTaskBar());
  }

  hideAddTaskBar(): void {
    this._store$.dispatch(hideAddTaskBar());
    // Restore focus to previously focused task after a small delay
    if (this._previouslyFocusedElement) {
      window.setTimeout(() => {
        if (
          this._previouslyFocusedElement &&
          document.body.contains(this._previouslyFocusedElement)
        ) {
          this._previouslyFocusedElement.focus();
          this._previouslyFocusedElement = null;
        }
      });
    }
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

  focusSideNav(): void {
    // Trigger the focus signal - components listening to this signal will handle the focus
    this._focusSideNavTrigger.update((value) => value + 1);
  }
}
