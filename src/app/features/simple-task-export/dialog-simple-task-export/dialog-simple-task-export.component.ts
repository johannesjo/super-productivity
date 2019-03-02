import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { SimpleSummarySettingsCopy } from '../../project/project.model';
import { SIMPLE_SUMMARY_DEFAULTS } from '../../project/project.const';

@Component({
  selector: 'dialog-simple-task-export',
  templateUrl: './dialog-simple-task-export.component.html',
  styleUrls: ['./dialog-simple-task-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogSimpleTaskExportComponent {
  options: SimpleSummarySettingsCopy = SIMPLE_SUMMARY_DEFAULTS;

  constructor(
    private _matDialogRef: MatDialogRef<DialogSimpleTaskExportComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
