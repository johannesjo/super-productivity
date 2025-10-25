import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { startFocusSession } from '../store/focus-mode.actions';
import { Store } from '@ngrx/store';
import { Subject, timer } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { T } from 'src/app/t.const';
import { TranslatePipe } from '@ngx-translate/core';
import { selectTimeDuration } from '../store/focus-mode.selectors';
import { FocusModeService } from '../focus-mode.service';
import {
  FocusModePreparationRocketComponent,
  type RocketState,
} from './focus-mode-preparation-rocket.component';

const COUNTDOWN_DURATION = 5;

@Component({
  selector: 'focus-mode-preparation',
  templateUrl: './focus-mode-preparation.component.html',
  styleUrls: ['./focus-mode-preparation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [TranslatePipe, FocusModePreparationRocketComponent],
})
export class FocusModePreparationComponent implements OnDestroy {
  private readonly _store = inject(Store);
  private readonly _focusModeService = inject(FocusModeService);

  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  readonly countdown = signal<number>(COUNTDOWN_DURATION);
  readonly rocketState = signal<RocketState>('pulse-5');
  private _hasLaunched = false;

  constructor() {
    timer(0, 1000)
      .pipe(takeUntil(this._onDestroy$), take(COUNTDOWN_DURATION + 1))
      .subscribe((tick) => {
        const remaining = COUNTDOWN_DURATION - tick;
        this.countdown.set(remaining);

        if (remaining > 0) {
          this.rocketState.set(`pulse-${remaining}` as RocketState);
        } else {
          this.rocketState.set('launch');
          if (!this._hasLaunched) {
            this._hasLaunched = true;
            window.setTimeout(() => this.startSession(), 900);
          }
        }
      });
  }

  startSession(): void {
    const duration = this._store.selectSignal(selectTimeDuration)();
    this._store.dispatch(startFocusSession({ duration }));
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }
}
