import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { WorklogExportSettingsCopy } from '../../project/project.model';
import { WORKLOG_EXPORT_DEFAULTS } from '../../project/project.const';

@Component({
  selector: 'dialog-worklog-export',
  templateUrl: './dialog-worklog-export.component.html',
  styleUrls: ['./dialog-worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogWorklogExportComponent {
  options: WorklogExportSettingsCopy = WORKLOG_EXPORT_DEFAULTS;

  constructor(
    private _matDialogRef: MatDialogRef<DialogWorklogExportComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }

  close() {
    this._matDialogRef.close();
  }
}
