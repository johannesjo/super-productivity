import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  cancelFocusSession,
  hideFocusOverlay,
  setFocusSessionActivePage,
} from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';
import {
  selectCurrentTask,
  selectLastCurrentTask,
} from '../../tasks/store/task.selectors';
import {
  selectFocusModeMode,
  selectLastSessionTotalDurationOrTimeElapsedFallback,
} from '../store/focus-mode.selectors';
import { map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { T } from 'src/app/t.const';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import confetti from 'canvas-confetti';

@Component({
  selector: 'focus-mode-task-done',
  templateUrl: './focus-mode-task-done.component.html',
  styleUrls: ['./focus-mode-task-done.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, AsyncPipe, MsToStringPipe, TranslatePipe],
})
export class FocusModeTaskDoneComponent implements AfterViewInit {
  private _store = inject(Store);

  mode$ = this._store.select(selectFocusModeMode);
  currentTask$ = this._store.select(selectCurrentTask);
  lastCurrentTask$ = this._store.select(selectLastCurrentTask);
  taskTitle$ = this.lastCurrentTask$.pipe(
    switchMap((lastCurrentTask) =>
      lastCurrentTask
        ? of(lastCurrentTask.title)
        : this.currentTask$.pipe(map((task) => task?.title)),
    ),
    take(1),
  );
  lastSessionTotalDuration$ = this._store.select(
    selectLastSessionTotalDurationOrTimeElapsedFallback,
  );
  T: typeof T = T;

  ngAfterViewInit(): void {
    const defaults = { startVelocity: 80, spread: 720, ticks: 600, zIndex: 0 };

    const particleCount = 200;
    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.5, y: 1 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.5, y: 1 },
    });
  }

  cancelAndCloseFocusOverlay(): void {
    this._store.dispatch(hideFocusOverlay());
    this._store.dispatch(cancelFocusSession());
  }

  startNextFocusSession(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
    );
  }

  continueWithFocusSession(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
    );
  }
}
