import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { Store } from '@ngrx/store';
import { selectTimeElapsed } from '../store/focus-mode.selectors';
import {
  cancelFocusSession,
  hideFocusOverlay,
  selectFocusDuration,
  selectFocusTask,
  setFocusModeMode,
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
import { FocusModeSessionDoneComponent } from '../focus-mode-session-done/focus-mode-session-done.component';
import { FocusModeBreakComponent } from '../focus-mode-break/focus-mode-break.component';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { FocusModeService } from '../focus-mode.service';
import { FocusModeMode, FocusScreen } from '../focus-mode.model';

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
    FocusModeSessionDoneComponent,
    FocusModeBreakComponent,
    MatButton,
    TranslatePipe,
    MatButtonToggleGroup,
    MatButtonToggle,
    NgTemplateOutlet,
  ],
})
export class FocusModeOverlayComponent implements OnDestroy {
  readonly taskService = inject(TaskService);
  readonly bannerService = inject(BannerService);
  readonly focusModeService = inject(FocusModeService);

  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);

  FocusScreen: typeof FocusScreen = FocusScreen;
  FocusModeMode: typeof FocusModeMode = FocusModeMode;

  selectedMode = this.focusModeService.mode;
  activePage = this.focusModeService.currentScreen;
  isSessionRunning = this.focusModeService.isSessionRunning;

  isPomodoroEnabled = toSignal(this._store.select(selectIsPomodoroEnabled), {
    initialValue: false,
  });

  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  private _closeOnEscapeKeyListener = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      if (
        this.activePage() === FocusScreen.TaskSelection ||
        this.activePage() === FocusScreen.DurationSelection
      ) {
        this.cancelFocusSession();
      }
    }
  };

  constructor() {
    this.bannerService.dismiss(BannerId.FocusMode);

    document.addEventListener('keydown', this._closeOnEscapeKeyListener);

    if (
      this.activePage() === FocusScreen.SessionDone ||
      this.isSessionRunning() ||
      this.focusModeService.isBreakActive()
    ) {
      return;
    } else {
      this.taskService.currentTask$
        .pipe(first(), takeUntil(this._onDestroy$))
        .subscribe((task) => {
          // If a session is already running or break is active, don't do anything - just show the current state

          if (!task) {
            this._store.dispatch(selectFocusTask());
          } else {
            this._store.dispatch(selectFocusDuration());
          }
        });
    }
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
    const isOnBreak = this.focusModeService.isBreakActive();

    if (this.isSessionRunning() || isOnBreak) {
      const mode = this.selectedMode();
      const cycle = this.focusModeService.currentCycle();

      // Determine banner message based on session type
      let translationKey: string;
      let icon: string;
      let timer$;
      let progress$;

      if (isOnBreak) {
        // Break is active
        translationKey =
          mode === FocusModeMode.Pomodoro
            ? T.F.FOCUS_MODE.B.POMODORO_BREAK_RUNNING
            : T.F.FOCUS_MODE.B.BREAK_RUNNING;
        icon = 'free_breakfast';
        timer$ = this.focusModeService.timeToGo$;
        progress$ = this.focusModeService.sessionProgress$;
      } else {
        // Work session is active
        const isCountTimeUp = mode === FocusModeMode.Flowtime;
        translationKey =
          mode === FocusModeMode.Pomodoro
            ? T.F.FOCUS_MODE.B.POMODORO_SESSION_RUNNING
            : T.F.FOCUS_MODE.B.SESSION_RUNNING;
        icon = 'center_focus_strong';
        timer$ = isCountTimeUp
          ? this._store.select(selectTimeElapsed)
          : this.focusModeService.timeToGo$;
        progress$ = isCountTimeUp ? undefined : this.focusModeService.sessionProgress$;
      }

      const translateParams =
        mode === FocusModeMode.Pomodoro ? { cycleNr: cycle || 1 } : undefined;

      this.bannerService.open({
        id: BannerId.FocusMode,
        ico: icon,
        msg: translationKey,
        translateParams,
        timer$,
        progress$,
        action2: {
          label: T.F.FOCUS_MODE.B.TO_FOCUS_OVERLAY,
          fn: () => {
            this._store.dispatch(showFocusOverlay());
          },
        },
        action: {
          label: T.G.CANCEL,
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

  selectMode(mode: FocusModeMode): void {
    this._store.dispatch(setFocusModeMode({ mode }));
  }

  deactivatePomodoro(): void {
    this._globalConfigService.updateSection('pomodoro', { isEnabled: false });
  }
}
