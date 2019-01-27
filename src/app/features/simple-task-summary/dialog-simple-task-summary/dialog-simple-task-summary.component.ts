import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { SimpleSummarySettingsCopy } from '../../project/project.model';
import { SIMPLE_SUMMARY_DEFAULTS } from '../../project/project.const';

@Component({
  selector: 'dialog-simple-task-summary',
  templateUrl: './dialog-simple-task-summary.component.html',
  styleUrls: ['./dialog-simple-task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSimpleTaskSummaryComponent {
  options: SimpleSummarySettingsCopy = SIMPLE_SUMMARY_DEFAULTS;

  constructor(
    private _matDialogRef: MatDialogRef<DialogSimpleTaskSummaryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
