import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectFocusSessionDuration } from '../store/focus-mode.selectors';
import {
  setFocusSessionActivePage,
  setFocusSessionDuration,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';
import { selectCurrentTask } from '../../tasks/store/task.selectors';

@Component({
  selector: 'focus-mode-duration-selection',
  templateUrl: './focus-mode-duration-selection.component.html',
  styleUrls: ['./focus-mode-duration-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeDurationSelectionComponent implements AfterViewInit, OnDestroy {
  sessionDuration$ = this._store.select(selectFocusSessionDuration);
  task$ = this._store.select(selectCurrentTask);
  focusModeDuration = 25 * 60 * 1000;
  focusTimeout = 0;

  constructor(private readonly _store: Store) {}

  ngAfterViewInit(): void {
    this.focusTimeout = window.setTimeout(() => {
      const el = document.querySelector('input');
      (el as HTMLElement).focus();
      (el as any).select();
    }, 200);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.focusTimeout);
  }

  onFocusModeDurationChanged(duration: number): void {
    this.focusModeDuration = duration;
  }

  onSubmit($event: SubmitEvent): void {
    $event.preventDefault();
    if (this.focusModeDuration) {
      this._store.dispatch(
        setFocusSessionDuration({ focusSessionDuration: this.focusModeDuration }),
      );
      this._store.dispatch(startFocusSession());
      this._store.dispatch(
        setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
      );
    }
  }
}
