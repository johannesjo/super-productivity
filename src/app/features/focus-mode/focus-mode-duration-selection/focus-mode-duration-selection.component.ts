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
  setFocusSessionActivePage,
  setFocusSessionDuration,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { InputDurationSliderComponent } from '../../../ui/duration/input-duration-slider/input-duration-slider.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { FocusModeService } from '../focus-mode.service';

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
  cfg = this._focusModeService.focusModeConfig;
  selectedMode = this._focusModeService.focusModeMode;
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
      this._store.dispatch(startFocusSession());
      this._store.dispatch(
        setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
      );
    } else {
      this._store.dispatch(
        setFocusSessionActivePage({ focusActivePage: FocusModePage.Preparation }),
      );
    }
  }

  selectDifferentTask(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
    );
  }

  protected readonly FocusModeMode = FocusModeMode;
}
