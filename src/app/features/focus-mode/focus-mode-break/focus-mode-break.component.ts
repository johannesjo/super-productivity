import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FocusModeService } from '../focus-mode.service';
import { MsToClockStringPipe } from '../../../ui/duration/ms-to-clock-string.pipe';
import { Store } from '@ngrx/store';
import { skipBreak } from '../store/focus-mode.actions';

@Component({
  selector: 'focus-mode-break',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MsToClockStringPipe],
  templateUrl: './focus-mode-break.component.html',
  styleUrl: './focus-mode-break.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeBreakComponent {
  private readonly _focusModeService = inject(FocusModeService);
  private readonly _store = inject(Store);

  private readonly _breakTimeElapsed = this._focusModeService.focusModeBreakTimeElapsed;
  private readonly _breakDuration = this._focusModeService.focusModeBreakDuration;
  readonly currentCycle = this._focusModeService.focusModeCurrentCycle;
  private readonly _isLongBreak = this._focusModeService.focusModeIsBreakLong;

  readonly remainingTime = computed(() =>
    Math.max(0, this._breakDuration() - this._breakTimeElapsed()),
  );

  readonly progressPercentage = computed(() => {
    const duration = this._breakDuration();
    return duration === 0
      ? 0
      : Math.min(100, (this._breakTimeElapsed() / duration) * 100);
  });

  readonly breakTypeLabel = computed(() =>
    this._isLongBreak() ? 'Long Break' : 'Short Break',
  );

  skipBreak(): void {
    this._store.dispatch(skipBreak());
  }
}
