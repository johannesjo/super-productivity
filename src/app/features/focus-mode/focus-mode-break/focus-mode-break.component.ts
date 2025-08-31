import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FocusModeService } from '../focus-mode.service';
import { MsToClockStringPipe } from '../../../ui/duration/ms-to-clock-string.pipe';
import { Store } from '@ngrx/store';
import { completeBreak, skipBreak } from '../store/focus-mode.actions';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'focus-mode-break',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MsToClockStringPipe, MatIcon],
  templateUrl: './focus-mode-break.component.html',
  styleUrl: './focus-mode-break.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeBreakComponent {
  readonly focusModeService = inject(FocusModeService);
  private readonly _store = inject(Store);

  readonly remainingTime = computed(() => {
    return this.focusModeService.timeRemaining() || 0;
  });

  readonly progressPercentage = computed(() => {
    return this.focusModeService.progress() || 0;
  });

  readonly breakTypeLabel = computed(() =>
    this.focusModeService.isBreakLong() ? 'Long Break' : 'Short Break',
  );

  skipBreak(): void {
    this._store.dispatch(skipBreak());
  }

  completeBreak(): void {
    this._store.dispatch(completeBreak());
  }
}
