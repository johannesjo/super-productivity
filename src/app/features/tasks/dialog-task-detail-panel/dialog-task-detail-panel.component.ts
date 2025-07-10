import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { selectSelectedTask } from '../store/task.selectors';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { setSelectedTask } from '../store/task.actions';
import { TaskDetailTargetPanel } from '../task.model';
import { skipWhile } from 'rxjs/operators';
import { TaskDetailPanelComponent } from '../task-detail-panel/task-detail-panel.component';

@Component({
  selector: 'dialog-task-detail-panel',
  imports: [CommonModule, TranslateModule, MatDialogContent, TaskDetailPanelComponent],
  templateUrl: './dialog-task-detail-panel.component.html',
  styleUrl: './dialog-task-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTaskDetailPanelComponent implements OnDestroy {
  data = inject<{
    taskId: string;
  }>(MAT_DIALOG_DATA);
  private _matDialogRef =
    inject<MatDialogRef<DialogTaskDetailPanelComponent>>(MatDialogRef);
  private _store = inject(Store);

  T: typeof T = T;
  task$ = this._store.select(selectSelectedTask).pipe(skipWhile((v) => !v));

  constructor() {
    const data = this.data;

    this._store.dispatch(
      setSelectedTask({
        id: data.taskId,
        taskDetailTargetPanel: TaskDetailTargetPanel.DONT_OPEN_PANEL,
        isSkipToggle: true,
      }),
    );
    // this.task$.subscribe((v) => TaskLog.log(`task$`, v));
  }

  // close(): void {
  //   this._matDialogRef.close();
  // }
  ngOnDestroy(): void {
    this._store.dispatch(
      setSelectedTask({
        id: null,
      }),
    );
  }
}
