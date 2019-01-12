import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { PomodoroService } from '../pomodoro.service';
import { map, takeUntil } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'dialog-pomodoro-break',
  templateUrl: './dialog-pomodoro-break.component.html',
  styleUrls: ['./dialog-pomodoro-break.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogPomodoroBreakComponent {
  isStopCurrentTime$ = new Subject();
  currentTime$: Observable<number> = this.pomodoroService.currentSessionTime$.pipe(takeUntil(this.isStopCurrentTime$));
  isBreakDone$ = this.pomodoroService.isBreak$.pipe(map(v => !v));
  currentCycle$ = this.pomodoroService.currentCycle$;
  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogPomodoroBreakComponent>,
    public pomodoroService: PomodoroService,
  ) {
    _matDialogRef.disableClose = true;

    this._subs.add(this.pomodoroService.isBreak$.subscribe((isBreak) => {
      if (!isBreak) {
        this.isStopCurrentTime$.next(true);
        this.close();
      }
    }));
  }

  close() {
    this._matDialogRef.close(null);
  }

  finishBreak() {
    this.isStopCurrentTime$.next(true);
    this.pomodoroService.skipBreak();
    this.close();
  }
}
