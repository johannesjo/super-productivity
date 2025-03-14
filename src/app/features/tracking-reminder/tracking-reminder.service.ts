import { Injectable, inject } from '@angular/core';
import { IdleService } from '../idle/idle.service';
import { TaskService } from '../tasks/task.service';
import { GlobalConfigService } from '../config/global-config.service';
import { combineLatest, EMPTY, merge, Observable, of, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  withLatestFrom,
  take,
} from 'rxjs/operators';
import { realTimer$ } from '../../util/real-timer';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { MatDialog } from '@angular/material/dialog';
import { DialogTrackingReminderComponent } from './dialog-tracking-reminder/dialog-tracking-reminder.component';
import { Task } from '../tasks/task.model';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { TimeTrackingConfig } from '../config/global-config.model';
import { IS_TOUCH_ONLY } from '../../util/is-touch-only';
import { DateService } from 'src/app/core/date/date.service';
import { TakeABreakService } from '../take-a-break/take-a-break.service';
import { UiHelperService } from '../../features/ui-helper/ui-helper.service';
import { IS_ELECTRON } from '../../app.constants';

@Injectable({
  providedIn: 'root',
})
export class TrackingReminderService {
  private _idleService = inject(IdleService);
  private _taskService = inject(TaskService);
  private _globalConfigService = inject(GlobalConfigService);
  private _bannerService = inject(BannerService);
  private _matDialog = inject(MatDialog);
  private _translateService = inject(TranslateService);
  private _dateService = inject(DateService);
  private _takeABreakService = inject(TakeABreakService);
  private _uiHelperService = inject(UiHelperService);

  // New property to track fullscreen state
  private _isFullscreenActive = false;
  // New property to track window focus state
  private _isWindowFocused = false;

  _cfg$: Observable<TimeTrackingConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.timeTracking),
  );

  _counter$: Observable<number> = realTimer$(1000);

  _manualReset$: Subject<void> = new Subject();

  _resetableCounter$: Observable<number> = merge(of('INITIAL'), this._manualReset$).pipe(
    switchMap(() => this._counter$),
  );

  _hideTrigger$: Observable<any> = merge(
    this._taskService.currentTaskId$.pipe(filter((currentId) => !!currentId)),
    this._idleService.isIdle$.pipe(filter((isIdle) => isIdle)),
  );

  remindCounter$: Observable<number> = this._cfg$.pipe(
    switchMap((cfg) =>
      !cfg?.isTrackingReminderEnabled ||
      (!cfg.isTrackingReminderShowOnMobile && IS_TOUCH_ONLY)
        ? EMPTY
        : combineLatest([
            this._taskService.currentTaskId$,
            this._idleService.isIdle$,
          ]).pipe(
            map(([currentTaskId, isIdle]) => !currentTaskId && !isIdle),
            distinctUntilChanged(),
            switchMap((isEnabled) => (isEnabled ? this._resetableCounter$ : of(0))),
            filter((time) => time > cfg.trackingReminderMinTime),
          ),
    ),
    shareReplay(),
  );

  init(): void {
    this.remindCounter$.subscribe((count) => {
      this._triggerBanner(count);
    });

    this._hideTrigger$.subscribe((v) => {
      this._hideBanner();
    });

    // Add window focus event listeners
    if (IS_ELECTRON) {
      window.addEventListener('focus', () => (this._isWindowFocused = true));
      window.addEventListener('blur', () => (this._isWindowFocused = false));
      // Initial focus check
      this._isWindowFocused = document.hasFocus();
    }
  }

  private _hideBanner(): void {
    this._bannerService.dismiss(BannerId.StartTrackingReminder);
    this._restoreWindowState();
  }

  private _triggerBanner(duration: number): void {
    // don't update if this or other dialogs are open
    if (this._matDialog.openDialogs.length !== 0) {
      return;
    }

    // Get the current config to check if forced mode is enabled
    this._cfg$.pipe(take(1)).subscribe((cfg) => {
      if (IS_ELECTRON && cfg.isFullScreenTrackingReminder) {
        // Only flash frame if window is not already focused
        if (!this._isWindowFocused) {
          window.ea.flashFrame();

          // Force focus the app window only if no dialog is open and window is not already focused
          if (this._matDialog.openDialogs.length === 0) {
            this._uiHelperService.focusApp();
          }
        }

        // We need to set fullscreen on the main window
        if (window.ea.setFullScreenMainWin && !this._isFullscreenActive) {
          window.ea.setFullScreenMainWin(true);
          this._isFullscreenActive = true;
        }
      }

      const durationStr = msToString(duration);
      this._bannerService.open({
        id: BannerId.StartTrackingReminder,
        ico: 'timer',
        msg: this._translateService.instant(T.F.TIME_TRACKING.B_TTR.MSG, {
          time: durationStr,
        }),
        action: {
          label: T.F.TIME_TRACKING.B_TTR.ADD_TO_TASK,
          fn: () => this._openDialog(),
        },
        action2: {
          label: T.G.DISMISS,
          fn: () => this._dismissBanner(),
        },
      });
    });
  }

  private _openDialog(): void {
    this._matDialog
      .open(DialogTrackingReminderComponent, {
        data: {
          disableClose: true,
          remindCounter$: this.remindCounter$,
        },
      })
      .afterClosed()
      .pipe(withLatestFrom(this.remindCounter$))
      .subscribe(
        async ([{ task } = { task: undefined }, remindCounter]: [
          { task: Task | string | undefined },
          number,
        ]): Promise<void> => {
          this._manualReset$.next();
          const timeSpent = remindCounter;

          // Restore window state after dialog closes
          this._restoreWindowState();

          if (task) {
            this._takeABreakService.otherNoBreakTIme$.next(timeSpent);
            if (typeof task === 'string') {
              const currId = this._taskService.add(task, false, {
                timeSpent,
                timeSpentOnDay: {
                  [this._dateService.todayStr()]: timeSpent,
                },
              });
              this._taskService.setCurrentId(currId);
            } else {
              this._taskService.addTimeSpent(task, timeSpent, undefined, true);
              this._taskService.setCurrentId(task.id);
            }
          }
          this._dismissBanner();
        },
      );
  }

  private _dismissBanner(): void {
    this._bannerService.dismiss(BannerId.StartTrackingReminder);
    this._restoreWindowState();
    this._manualReset$.next();
  }

  // Restore window to its original state
  private _restoreWindowState(): void {
    this._cfg$.pipe(take(1)).subscribe((cfg) => {
      if (IS_ELECTRON && this._isFullscreenActive && cfg.isFullScreenTrackingReminder) {
        this._isFullscreenActive = false;
        if (window.ea.setFullScreenMainWin) {
          window.ea.setFullScreenMainWin(false);
        }
      }
    });
  }
}
