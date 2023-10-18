import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { hideFocusOverlay, setFocusSessionActivePage } from '../store/focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';

@Component({
  selector: 'focus-mode-task-done',
  templateUrl: './focus-mode-task-done.component.html',
  styleUrls: ['./focus-mode-task-done.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskDoneComponent {
  constructor(private _store: Store) {}

  closeFocusOverlay(): void {
    this._store.dispatch(hideFocusOverlay());
  }

  startNextTask(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
    );
  }
}
