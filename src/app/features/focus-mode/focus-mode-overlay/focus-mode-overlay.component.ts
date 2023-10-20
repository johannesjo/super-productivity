import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { Router } from '@angular/router';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { FocusModePage } from '../focus-mode.const';
import { Store } from '@ngrx/store';
import {
  selectFocusSessionActivePage,
  selectFocusSessionDuration,
  selectFocusSessionProgress,
  selectFocusSessionTimeToGo,
} from '../store/focus-mode.selectors';
import {
  cancelFocusSession,
  setFocusSessionActivePage,
} from '../store/focus-mode.actions';
import { fadeInAnimation } from '../../../ui/animations/fade.ani';
import { warpAnimation, warpInAnimation } from '../../../ui/animations/warp.ani';

@Component({
  selector: 'focus-mode-overlay',
  templateUrl: './focus-mode-overlay.component.html',
  styleUrls: ['./focus-mode-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeInAnimation, warpAnimation, warpInAnimation],
})
export class FocusModeOverlayComponent implements OnDestroy {
  FocusModePage: typeof FocusModePage = FocusModePage;

  activePage$ = this._store.select(selectFocusSessionActivePage);
  timeToGo$ = this._store.select(selectFocusSessionTimeToGo);
  sessionDuration$ = this._store.select(selectFocusSessionDuration);
  sessionProgress$ = this._store.select(selectFocusSessionProgress);

  private _onDestroy$ = new Subject<void>();
  private _closeOnEscapeKeyListener = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      this.cancelFocusSession();
    }
  };

  constructor(
    public readonly taskService: TaskService,
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _store: Store,
    private readonly _router: Router,
  ) {
    document.addEventListener('keydown', this._closeOnEscapeKeyListener);

    this.taskService.currentTask$
      .pipe(first(), takeUntil(this._onDestroy$))
      .subscribe((task) => {
        if (!task) {
          this._store.dispatch(
            setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
          );
        } else {
          this._store.dispatch(
            setFocusSessionActivePage({
              focusActivePage: FocusModePage.DurationSelection,
            }),
          );
        }
      });
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    document.removeEventListener('keydown', this._closeOnEscapeKeyListener);
  }

  cancelFocusSession(): void {
    this._store.dispatch(cancelFocusSession());
  }
}
