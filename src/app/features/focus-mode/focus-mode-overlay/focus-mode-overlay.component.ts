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
  setFocusModeMode,
  showFocusOverlay,
  selectFocusTask,
  selectFocusDuration,
  startFocusSession,
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
import { FocusModeBreakComponent } from '../focus-mode-break/focus-mode-break.component';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { FocusModeService } from '../focus-mode.service';
import { FocusModeMode, FocusModePage } from '../focus-mode.model';

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

  FocusModePage: typeof FocusModePage = FocusModePage;
  FocusModeMode: typeof FocusModeMode = FocusModeMode;

  selectedMode = this.focusModeService.mode;
  activePage = this.focusModeService.activePage;
  isFocusSessionRunning = this.focusModeService.isFocusSessionRunning;

  isPomodoroEnabled = toSignal(this._store.select(selectIsPomodoroEnabled), {
    initialValue: false,
  });

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

    this.taskService.currentTask$
      .pipe(first(), takeUntil(this._onDestroy$))
      .subscribe((task) => {
        if (this.activePage() === FocusModePage.SessionDone) {
          return;
        }
        if (!task) {
          this._store.dispatch(selectFocusTask());
        } else if (this.isFocusSessionRunning()) {
          this._store.dispatch(startFocusSession({}));
        } else {
          this._store.dispatch(selectFocusDuration());
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
      const isCountTimeUp = this.selectedMode() === FocusModeMode.Flowtime;

      // Get current mode to determine translation key and parameters
      const mode = this.selectedMode();
      const cycle = this.focusModeService.currentCycle();

      const translationKey =
        mode === FocusModeMode.Pomodoro
          ? T.F.FOCUS_MODE.B.POMODORO_SESSION_RUNNING
          : T.F.FOCUS_MODE.B.SESSION_RUNNING;

      const translateParams =
        mode === FocusModeMode.Pomodoro ? { cycleNr: cycle || 1 } : undefined;

      this.bannerService.open({
        id: BannerId.FocusMode,
        ico: 'center_focus_strong',
        msg: translationKey,
        translateParams,
        timer$: isCountTimeUp
          ? this._store.select(selectTimeElapsed)
          : this.focusModeService.timeToGo$,
        progress$: isCountTimeUp ? undefined : this.focusModeService.sessionProgress$,
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
