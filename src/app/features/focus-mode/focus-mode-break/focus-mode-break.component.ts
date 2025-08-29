import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FocusModeService } from '../focus-mode.service';
import { Store } from '@ngrx/store';
import {
  selectFocusModeBreakTimeElapsed,
  selectFocusModeBreakDuration,
  selectFocusModeCurrentCycle,
  selectFocusModeIsBreakLong,
} from '../store/focus-mode.selectors';
import { MsToClockStringPipe } from '../../../ui/duration/ms-to-clock-string.pipe';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'focus-mode-break',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MsToClockStringPipe],
  templateUrl: './focus-mode-break.component.html',
  styleUrl: './focus-mode-break.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeBreakComponent {
  private readonly _store = inject(Store);
  private readonly _focusModeService = inject(FocusModeService);

  private readonly _breakTimeElapsed = toSignal(
    this._store.select(selectFocusModeBreakTimeElapsed),
    { initialValue: 0 },
  );

  private readonly _breakDuration = toSignal(
    this._store.select(selectFocusModeBreakDuration),
    { initialValue: 5 * 60 * 1000 },
  );

  readonly currentCycle = toSignal(this._store.select(selectFocusModeCurrentCycle), {
    initialValue: 1,
  });

  private readonly _isLongBreak = toSignal(
    this._store.select(selectFocusModeIsBreakLong),
    { initialValue: false },
  );

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
    this._focusModeService.skipBreak();
  }
}
