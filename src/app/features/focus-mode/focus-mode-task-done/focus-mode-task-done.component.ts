import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { hideFocusOverlay } from '../store/focus-mode.actions';

@Component({
  selector: 'focus-mode-task-done',
  templateUrl: './focus-mode-task-done.component.html',
  styleUrls: ['./focus-mode-task-done.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeTaskDoneComponent {
  @Input() focusModeDuration = 25 * 60 * 1000;

  constructor(private _store: Store) {}

  closeFocusOverlay(): void {
    this._store.dispatch(hideFocusOverlay());
  }
}
