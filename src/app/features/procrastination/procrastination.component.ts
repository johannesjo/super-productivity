import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TaskService } from '../tasks/task.service';
import { T } from '../../t.const';
import { Store } from '@ngrx/store';
import { setFocusSessionActivePage } from '../focus-mode/store/focus-mode.actions';
import { FocusModePage } from '../focus-mode/focus-mode.const';

@Component({
  selector: 'procrastination',
  templateUrl: './procrastination.component.html',
  styleUrls: ['./procrastination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProcrastinationComponent {
  taskService = inject(TaskService);
  private _store = inject(Store);

  T: typeof T = T;

  backToWork(): void {
    this._store.dispatch(
      setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
    );
  }
}
