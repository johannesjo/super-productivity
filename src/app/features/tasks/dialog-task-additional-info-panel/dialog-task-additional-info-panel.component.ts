import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksModule } from '../tasks.module';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { selectSelectedTask } from '../store/task.selectors';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '../../../ui/ui.module';
import { setSelectedTask } from '../store/task.actions';
import { TaskAdditionalInfoTargetPanel } from '../task.model';
import { skipWhile } from 'rxjs/operators';

@Component({
  selector: 'dialog-task-additional-info-panel',
  standalone: true,
  imports: [
    CommonModule,
    TasksModule,
    UiModule,
    TranslateModule,
    MatDialogContent,
    MatDialogActions,
  ],
  templateUrl: './dialog-task-additional-info-panel.component.html',
  styleUrl: './dialog-task-additional-info-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTaskAdditionalInfoPanelComponent {
  T: typeof T = T;
  task$ = this._store.select(selectSelectedTask).pipe(skipWhile((v) => !v));

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { taskId: string },
    private _matDialogRef: MatDialogRef<DialogTaskAdditionalInfoPanelComponent>,
    private _store: Store,
  ) {
    this._store.dispatch(
      setSelectedTask({
        id: data.taskId,
        taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel.Default,
        isSkipToggle: true,
      }),
    );
    // this.task$.subscribe((v) => console.log(`task$`, v));
  }

  // close(): void {
  //   this._matDialogRef.close();
  // }
}
