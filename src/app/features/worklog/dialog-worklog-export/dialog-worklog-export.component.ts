import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WORKLOG_EXPORT_DEFAULTS} from '../../project/project.const';
import {WorklogExportSettingsCopy} from '../worklog.model';
import {T} from '../../../t.const';

@Component({
  selector: 'dialog-worklog-export',
  templateUrl: './dialog-worklog-export.component.html',
  styleUrls: ['./dialog-worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogWorklogExportComponent {
  T = T;
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
