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

@Component({
  selector: 'focus-button',
  templateUrl: './focus-button.component.html',
  styleUrls: ['./focus-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconButton, MatTooltip, MatIcon, MsToMinuteClockStringPipe, TranslatePipe],
})
export class FocusButtonComponent {
  private readonly _store = inject(Store);
  private readonly _metricService = inject(MetricService);
  private readonly _configService = inject(GlobalConfigService);
  private readonly _dateService = inject(DateService);
  readonly focusModeService = inject(FocusModeService);

  T: typeof T = T;

  kb = computed<KeyboardConfig>(() => {
    return (this._configService.cfg()?.keyboard as KeyboardConfig) || {};
  });

  isSessionRunning = this.focusModeService.isSessionRunning;
  progress = this.focusModeService.progress;
  mode = this.focusModeService.mode;

  focusSummaryToday = computed(() =>
    this._metricService.getFocusSummaryForDay(this._dateService.todayStr()),
  );

  enableFocusMode(): void {
    this._store.dispatch(showFocusOverlay());
  }
}
