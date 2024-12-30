import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { PomodoroService } from '../pomodoro.service';
import { filter, map, mapTo, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';
import { T } from '../../../t.const';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';

@Component({
  selector: 'dialog-pomodoro-break',
  templateUrl: './dialog-pomodoro-break.component.html',
  styleUrls: ['./dialog-pomodoro-break.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MatDialogContent,
    TranslatePipe,
    MatDialogActions,
    MatButton,
    MatIcon,
    MsToMinuteClockStringPipe,
  ],
})
export class DialogPomodoroBreakComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogPomodoroBreakComponent>>(MatDialogRef);
  pomodoroService = inject(PomodoroService);

  T: typeof T = T;
  isStopCurrentTime$: Subject<boolean> = new Subject();
  currentTime$: Observable<number> = this.pomodoroService.currentSessionTime$.pipe(
    takeUntil(this.isStopCurrentTime$),
  );
  isManualPauseBreak$: Observable<boolean> = this.pomodoroService.isManualPauseBreak$;
  isManualPauseWork$: Observable<boolean> = this.pomodoroService.isManualPauseWork$;
  currentCycle$: Observable<number> = this.pomodoroService.currentCycle$.pipe(
    map((cycle) => cycle + 1),
  );

  private _subs: Subscription = new Subscription();
  private _isCloseDialog$: Observable<boolean> = this.pomodoroService.isBreak$.pipe(
    withLatestFrom(this.pomodoroService.cfg$),
    filter(([isBreak, cfg]) => !cfg.isManualContinue && !isBreak),
    mapTo(true),
  );

  constructor() {
    // _matDialogRef.disableClose = true;

    this._subs.add(
      this.pomodoroService.isBreak$.subscribe((isBreak) => {
        if (!isBreak) {
          this.isStopCurrentTime$.next(true);
        }
      }),
    );
    this._subs.add(
      this._isCloseDialog$.subscribe(() => {
        this.close();
      }),
    );
  }

  close(): void {
    // debug #1745 and #1685
    this._matDialogRef.close('REALLY NO RESULT');
  }

  nextSession(isSkipBreak: boolean = false): void {
    this.isStopCurrentTime$.next(true);
    if (isSkipBreak) {
      this.pomodoroService.skipBreak();
    } else {
      this.pomodoroService.finishPomodoroSession();
    }
    this.close();
  }

  startBreak(): void {
    this.pomodoroService.startBreak(false);
  }
}
