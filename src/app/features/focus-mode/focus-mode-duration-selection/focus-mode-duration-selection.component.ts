import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTimeDuration } from '../store/focus-mode.selectors';
import {
  setFocusSessionDuration,
  startFocusPreparation,
  startFocusSession,
  selectFocusTask,
} from '../store/focus-mode.actions';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { InputDurationSliderComponent } from '../../../ui/duration/input-duration-slider/input-duration-slider.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { FocusModeService } from '../focus-mode.service';
import { MatIcon } from '@angular/material/icon';
import { FocusModeMode, FOCUS_MODE_DEFAULTS } from '../focus-mode.model';
import { LS } from '../../../core/persistence/storage-keys.const';

@Component({
  selector: 'focus-mode-duration-selection',
  templateUrl: './focus-mode-duration-selection.component.html',
  styleUrls: ['./focus-mode-duration-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButton,
    InputDurationSliderComponent,
    AsyncPipe,
    TranslatePipe,
    MatIcon,
  ],
})
export class FocusModeDurationSelectionComponent implements AfterViewInit, OnDestroy {
  private readonly _store = inject(Store);
  private readonly _focusModeService = inject(FocusModeService);

  T: typeof T = T;
  sessionDuration$ = this._store.select(selectTimeDuration);
  task$ = this._store.select(selectCurrentTask);
  updatedFocusModeDuration: number = FOCUS_MODE_DEFAULTS.SESSION_DURATION;
  focusTimeout = 0;
  cfg = this._focusModeService.focusModeConfig;
  selectedMode = this._focusModeService.mode;

  private _onDestroy$ = new Subject<void>();

  ngAfterViewInit(): void {
    // Initialize duration from localStorage or use default
    const lastDuration = localStorage.getItem(LS.LAST_COUNTDOWN_DURATION);
    if (lastDuration) {
      this.updatedFocusModeDuration = parseInt(lastDuration, 10);
    }

    this.focusTimeout = window.setTimeout(() => {
      const el = document.querySelector('input');
      (el as HTMLElement)?.focus();
      (el as any)?.select();
    }, 200);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.focusTimeout);
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  onFocusModeDurationChanged(duration: number): void {
    this.updatedFocusModeDuration = duration;
  }

  onSubmit($event?: SubmitEvent): void {
    $event?.preventDefault();
    if (this.updatedFocusModeDuration) {
      // Save the duration to localStorage for next time
      localStorage.setItem(
        LS.LAST_COUNTDOWN_DURATION,
        this.updatedFocusModeDuration.toString(),
      );

      this._store.dispatch(
        setFocusSessionDuration({ focusSessionDuration: this.updatedFocusModeDuration }),
      );
    }
    if (this.cfg()?.isSkipPreparation) {
      this._store.dispatch(
        startFocusSession({ duration: this.updatedFocusModeDuration }),
      );
    } else {
      this._store.dispatch(startFocusPreparation());
    }
  }

  selectDifferentTask(): void {
    this._store.dispatch(selectFocusTask());
  }

  protected readonly FocusModeMode = FocusModeMode;
}
