import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectFocusSessionDuration } from '../store/focus-mode.selectors';
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
import { FocusModeMode } from '../focus-mode.model';

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
  sessionDuration$ = this._store.select(selectFocusSessionDuration);
  task$ = this._store.select(selectCurrentTask);
  updatedFocusModeDuration?: number;
  focusTimeout = 0;
  cfg = this._focusModeService.cfg;
  selectedMode = this._focusModeService.mode;

  private _onDestroy$ = new Subject<void>();

  ngAfterViewInit(): void {
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
