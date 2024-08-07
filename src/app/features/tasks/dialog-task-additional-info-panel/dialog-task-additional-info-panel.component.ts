import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksModule } from '../tasks.module';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { selectTaskByIdWithSubTaskData } from '../store/task.selectors';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '../../../ui/ui.module';

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
  // task$ = this._store.select(selectSelectedTask);
  task$ = this._store.select(selectTaskByIdWithSubTaskData, {
    id: 'nsDUzWEBKJSjTlx7b912N',
  });

  constructor(
    private _matDialogRef: MatDialogRef<DialogTaskAdditionalInfoPanelComponent>,
    private _store: Store,
  ) {
    this.task$.subscribe((v) => console.log(`task$`, v));
  }

  close(): void {
    this._matDialogRef.close();
  }
}
