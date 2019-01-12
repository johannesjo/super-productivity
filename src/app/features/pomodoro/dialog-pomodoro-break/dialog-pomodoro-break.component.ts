import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { PomodoroService } from '../pomodoro.service';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'dialog-pomodoro-break',
  templateUrl: './dialog-pomodoro-break.component.html',
  styleUrls: ['./dialog-pomodoro-break.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogPomodoroBreakComponent {
  isBreakDone$ = this.pomodoroService.isBreak$.pipe(map(v => !v));

  private _subs = new Subscription();

  constructor(
    private _matDialogRef: MatDialogRef<DialogPomodoroBreakComponent>,
    public pomodoroService: PomodoroService,
  ) {
    _matDialogRef.disableClose = true;

    this._subs.add(this.pomodoroService.isBreak$.subscribe((isBreak) => {
      if (!isBreak) {
        this.close();
      }
    }));
  }

  close() {
    this._matDialogRef.close(null);
  }

  finishBreak() {
    this.close();
  }
}
