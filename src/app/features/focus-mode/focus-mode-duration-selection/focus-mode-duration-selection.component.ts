import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectFocusModeMode,
  selectFocusSessionDuration,
} from '../store/focus-mode.selectors';
import {
  setFocusSessionActivePage,
  setFocusSessionDuration,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { selectFocusModeConfig } from '../../config/store/global-config.reducer';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { InputDurationSliderComponent } from '../../../ui/duration/input-duration-slider/input-duration-slider.component';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'focus-mode-duration-selection',
  templateUrl: './focus-mode-duration-selection.component.html',
  styleUrls: ['./focus-mode-duration-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButton, InputDurationSliderComponent, TranslatePipe],
})
export class FocusModeDurationSelectionComponent implements AfterViewInit {
  private readonly _store = inject(Store);
  private readonly _destroyRef = inject(DestroyRef);

  readonly T = T;
  readonly FocusModeMode = FocusModeMode;

  readonly currentTask = toSignal(this._store.select(selectCurrentTask));
  readonly selectedMode = toSignal(this._store.select(selectFocusModeMode));
  readonly cfg = toSignal(this._store.select(selectFocusModeConfig));
  readonly focusModeDuration = toSignal(this._store.select(selectFocusSessionDuration), {
    initialValue: 0,
  });

  @ViewChild('durationInput', { read: ElementRef })
  private durationInputRef?: ElementRef<HTMLInputElement>;

  private focusTimeout = 0;

  constructor() {
    this._destroyRef.onDestroy(() => {
      if (this.focusTimeout) {
        window.clearTimeout(this.focusTimeout);
      }
    });
  }

  ngAfterViewInit(): void {
    this.focusTimeout = window.setTimeout(() => {
      if (this.durationInputRef?.nativeElement) {
        this.durationInputRef.nativeElement.focus();
        this.durationInputRef.nativeElement.select();
      }
    }, 200);
  }

  onSubmit(event?: SubmitEvent): void {
    event?.preventDefault();

    const duration = this.focusModeDuration();
    if (duration) {
      this._store.dispatch(setFocusSessionDuration({ focusSessionDuration: duration }));
    }

    const config = this.cfg();
    if (config?.isSkipPreparation) {
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

  updateDuration(value: number): void {
    this._store.dispatch(setFocusSessionDuration({ focusSessionDuration: value }));
  }
}
