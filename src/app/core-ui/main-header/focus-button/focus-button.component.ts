import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { FocusModeService } from '../../../features/focus-mode/focus-mode.service';
import { MetricService } from '../../../features/metric/metric.service';
import { Store } from '@ngrx/store';
import { showFocusOverlay } from '../../../features/focus-mode/store/focus-mode.actions';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { KeyboardConfig } from '../../../features/config/keyboard-config.model';
import { DateService } from '../../../core/date/date.service';
import { FocusModeMode } from '../../../features/focus-mode/focus-mode.model';
import { ProgressCircleComponent } from '../../../ui/progress-circle/progress-circle.component';

@Component({
  selector: 'focus-button',
  templateUrl: './focus-button.component.html',
  styleUrls: ['./focus-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatTooltip,
    MatIcon,
    MsToMinuteClockStringPipe,
    TranslatePipe,
    ProgressCircleComponent,
  ],
})
export class FocusButtonComponent {
  private readonly _store = inject(Store);
  private readonly _metricService = inject(MetricService);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _dateService = inject(DateService);
  readonly focusModeService = inject(FocusModeService);

  T: typeof T = T;

  readonly kb = computed<KeyboardConfig>(() => {
    return (this._configService.cfg()?.keyboard as KeyboardConfig) || {};
  });

  readonly isSessionRunning = this.focusModeService.isSessionRunning;
  readonly progress = this.focusModeService.progress;
  readonly mode = this.focusModeService.mode;
  readonly FocusModeMode = FocusModeMode;

  readonly focusSummaryToday = computed(() =>
    this._metricService.getFocusSummaryForDay(this._dateService.todayStr()),
  );

  readonly tooltipSuffix = computed(() => {
    const shortcut = this.kb().goToFocusMode;
    return shortcut ? ` [${shortcut}]` : '';
  });

  readonly circleVisible = computed(() => this.isSessionRunning());

  readonly circleProgress = computed<number | null>(() => {
    if (!this.circleVisible()) {
      return null;
    }
    const mode = this.mode();
    if (mode === FocusModeMode.Countdown || mode === FocusModeMode.Pomodoro) {
      const progress = this.progress();
      return typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
    }
    return null;
  });

  readonly circleShouldPulse = computed(
    () => this.circleVisible() && this.mode() === FocusModeMode.Flowtime,
  );

  readonly buttonColor = computed(() => (this.circleVisible() ? 'accent' : undefined));

  enableFocusMode(): void {
    this._store.dispatch(showFocusOverlay());
  }
}
