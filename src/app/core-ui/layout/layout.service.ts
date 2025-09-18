import { inject, Injectable, signal } from '@angular/core';
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
import { map } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { IS_MOBILE } from '../../util/is-mobile';
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';

const XS_BREAKPOINT = 600;
const XXXS_BREAKPOINT = 398;
const XS_MEDIA_QUERY = `(max-width: ${XS_BREAKPOINT}px)`;
const initialXsMatch =
  typeof window !== 'undefined' ? window.matchMedia(XS_MEDIA_QUERY).matches : false;

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private _store$ = inject<Store<LayoutState>>(Store);
  private _breakPointObserver = inject(BreakpointObserver);
  private _previouslyFocusedElement: HTMLElement | null = null;

  readonly isShowMobileBottomNav = IS_MOBILE && IS_TOUCH_PRIMARY;

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

  // private _isWorkViewUrl(url: string): boolean {
  //   return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  // }

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
