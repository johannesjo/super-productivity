import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { combineLatest, Observable, Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { FocusModePage } from '../focus-mode.const';
import { Store } from '@ngrx/store';
import {
  selectFocusSessionActivePage,
  selectFocusSessionProgress,
  selectFocusSessionTimeToGo,
  selectIsFocusSessionRunning,
} from '../store/focus-mode.selectors';
import {
  cancelFocusSession,
  hideFocusOverlay,
  setFocusSessionActivePage,
  showFocusOverlay,
} from '../store/focus-mode.actions';
import { fadeInAnimation } from '../../../ui/animations/fade.ani';
import { warpAnimation, warpInAnimation } from '../../../ui/animations/warp.ani';
import { T } from 'src/app/t.const';
import { selectIsPomodoroEnabled } from '../../config/store/global-config.reducer';
import { BannerComponent } from '../../../core/banner/banner/banner.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { FocusModeTaskSelectionComponent } from '../focus-mode-task-selection/focus-mode-task-selection.component';
import { FocusModeDurationSelectionComponent } from '../focus-mode-duration-selection/focus-mode-duration-selection.component';
import { FocusModePreparationComponent } from '../focus-mode-preparation/focus-mode-preparation.component';
import { FocusModeMainComponent } from '../focus-mode-main/focus-mode-main.component';
import { FocusModeTaskDoneComponent } from '../focus-mode-task-done/focus-mode-task-done.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ProcrastinationComponent } from '../../procrastination/procrastination.component';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'focus-mode-overlay',
  templateUrl: './focus-mode-overlay.component.html',
  styleUrls: ['./focus-mode-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeInAnimation, warpAnimation, warpInAnimation],
  imports: [
    BannerComponent,
    MatIconButton,
    MatIcon,
    FocusModeTaskSelectionComponent,
    FocusModeDurationSelectionComponent,
    FocusModePreparationComponent,
    FocusModeMainComponent,
    FocusModeTaskDoneComponent,
    MatButton,
    AsyncPipe,
    TranslatePipe,
    ProcrastinationComponent,
  ],
})
export class FocusModeOverlayComponent implements OnDestroy {
  readonly taskService = inject(TaskService);
  readonly bannerService = inject(BannerService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);

  FocusModePage: typeof FocusModePage = FocusModePage;

  activePage = toSignal(this._store.select(selectFocusSessionActivePage), {
    initialValue: undefined,
  });
  isFocusSessionRunning = toSignal(this._store.select(selectIsFocusSessionRunning), {
    initialValue: undefined,
  });

  isPomodoroEnabled$: Observable<boolean> = this._store.select(selectIsPomodoroEnabled);

  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  private _closeOnEscapeKeyListener = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      if (
        this.activePage() === FocusModePage.TaskSelection ||
        this.activePage() === FocusModePage.DurationSelection
      ) {
        this.cancelFocusSession();
      }
    }
  };

  constructor() {
    this.bannerService.dismiss(BannerId.FocusMode);

    document.addEventListener('keydown', this._closeOnEscapeKeyListener);

    combineLatest([this.taskService.currentTask$])
      .pipe(first(), takeUntil(this._onDestroy$))
      .subscribe((task) => {
        if (this.activePage() === FocusModePage.SessionDone) {
          return;
        }
        if (!task) {
          this._store.dispatch(
            setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
          );
        } else if (this.isFocusSessionRunning()) {
          this._store.dispatch(
            setFocusSessionActivePage({
              focusActivePage: FocusModePage.Main,
            }),
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

  back(): void {
    window.history.back();
  }

  closeOverlay(): void {
    if (this.isFocusSessionRunning()) {
      this.bannerService.open({
        id: BannerId.FocusMode,
        ico: 'center_focus_strong',
        msg: 'Focus Session is running',
        timer$: this._store.select(selectFocusSessionTimeToGo),
        progress$: this._store.select(selectFocusSessionProgress),
        action2: {
          label: 'To Focus Overlay',
          fn: () => {
            this._store.dispatch(showFocusOverlay());
          },
        },
        action: {
          label: 'Cancel',
          fn: () => {
            this._store.dispatch(cancelFocusSession());
          },
        },
      });
    }
    this._store.dispatch(hideFocusOverlay());
  }

  cancelFocusSession(): void {
    this._store.dispatch(cancelFocusSession());
  }

  deactivatePomodoro(): void {
    this._globalConfigService.updateSection('pomodoro', { isEnabled: false });
  }

  leaveProcrastinationHelp(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
    );
  }
}
