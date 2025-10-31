import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { Subject, timer } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { T } from '../../../t.const';
import { TranslatePipe } from '@ngx-translate/core';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import {
  FocusModePreparationRocketComponent,
  type RocketState,
} from '../focus-mode-preparation/focus-mode-preparation-rocket.component';

@Component({
  selector: 'focus-mode-countdown',
  templateUrl: './focus-mode-countdown.component.html',
  styleUrls: ['./focus-mode-countdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [TranslatePipe, FocusModePreparationRocketComponent],
})
export class FocusModeCountdownComponent implements OnInit, OnDestroy {
  readonly countdownComplete = output<void>();

  readonly T = T;
  countdownValue = signal<number>(1);
  rocketState = signal<RocketState>('pulse-5');

  private readonly COUNTDOWN_DURATION = 1;
  private _onDestroy$ = new Subject<void>();

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  private startCountdown(): void {
    this.countdownValue.set(this.COUNTDOWN_DURATION);
    this.rocketState.set('pulse-5');

    timer(0, 1000)
      .pipe(takeUntil(this._onDestroy$), take(this.COUNTDOWN_DURATION + 1))
      .subscribe((tick) => {
        const remaining = this.COUNTDOWN_DURATION - tick;
        this.countdownValue.set(remaining);

        if (remaining > 0) {
          this.rocketState.set(`pulse-${remaining}` as RocketState);
        } else {
          this.rocketState.set('launch');
          window.setTimeout(() => {
            this.countdownComplete.emit();
          }, 900);
        }
      });
  }
}
