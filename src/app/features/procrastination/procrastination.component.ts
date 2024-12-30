import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TaskService } from '../tasks/task.service';
import { T } from '../../t.const';
import { Store } from '@ngrx/store';
import { setFocusSessionActivePage } from '../focus-mode/store/focus-mode.actions';
import { FocusModePage } from '../focus-mode/focus-mode.const';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TaskComponent } from '../tasks/task/task.component';
import { MatButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'procrastination',
  templateUrl: './procrastination.component.html',
  styleUrls: ['./procrastination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabGroup,
    MatTab,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    TaskComponent,
    MatButton,
    AsyncPipe,
    TranslatePipe,
  ],
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
