import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Observable, Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { Router } from '@angular/router';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { FocusModePage } from '../focus-mode.const';
import { Store } from '@ngrx/store';
import { selectFocusSessionActivePage } from '../store/focus-mode.selectors';
import {
  cancelFocusSession,
  setFocusSessionActivePage,
} from '../store/focus-mode.actions';
import { fadeInAnimation } from '../../../ui/animations/fade.ani';
import { warpAnimation, warpInAnimation } from '../../../ui/animations/warp.ani';
import { T } from 'src/app/t.const';
import { selectIsPomodoroEnabled } from '../../config/store/global-config.reducer';
import { BannerComponent } from '../../../core/banner/banner/banner.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { FocusModeTaskSelectionComponent } from '../focus-mode-task-selection/focus-mode-task-selection.component';
import { FocusModeDurationSelectionComponent } from '../focus-mode-duration-selection/focus-mode-duration-selection.component';
import { FocusModePreparationComponent } from '../focus-mode-preparation/focus-mode-preparation.component';
import { FocusModeMainComponent } from '../focus-mode-main/focus-mode-main.component';
import { FocusModeTaskDoneComponent } from '../focus-mode-task-done/focus-mode-task-done.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ProcrastinationComponent } from '../../procrastination/procrastination.component';

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
    MatTooltip,
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
  private readonly _globalConfigService = inject(GlobalConfigService);
  private readonly _store = inject(Store);
  private readonly _router = inject(Router);

  FocusModePage: typeof FocusModePage = FocusModePage;

  activePage$ = this._store.select(selectFocusSessionActivePage);

  isPomodoroEnabled$: Observable<boolean> = this._store.select(selectIsPomodoroEnabled);

  activatePage?: FocusModePage;
  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  private _closeOnEscapeKeyListener = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      if (
        this.activatePage === FocusModePage.TaskSelection ||
        this.activatePage === FocusModePage.DurationSelection
      ) {
        this.cancelFocusSession();
      }
    }
  };

  constructor() {
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
    this.activePage$.pipe(takeUntil(this._onDestroy$)).subscribe((activePage) => {
      this.activatePage = activePage;
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
