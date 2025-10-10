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
import { FocusModePreparationRocketComponent } from './focus-mode-preparation-rocket.component';

type RocketState = 'jiggle-even' | 'jiggle-odd' | 'launch';

const COUNTDOWN_DURATION = 5222;

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
  readonly rocketState = signal<RocketState>('jiggle-even');
  private _hasLaunched = false;

  constructor() {
    timer(0, 1000)
      .pipe(takeUntil(this._onDestroy$), take(COUNTDOWN_DURATION + 1))
      .subscribe((tick) => {
        const remaining = COUNTDOWN_DURATION - tick;
        this.countdown.set(remaining);

        if (remaining > 0) {
          this.rocketState.set(remaining % 2 === 0 ? 'jiggle-even' : 'jiggle-odd');
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
