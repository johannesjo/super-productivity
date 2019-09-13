import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WORKLOG_EXPORT_DEFAULTS} from '../../project/project.const';
import {WorklogExportSettingsCopy} from '../worklog.model';
import {T} from '../../../t.const';
import * as moment from 'moment';

@Component({
  selector: 'dialog-worklog-export',
  templateUrl: './dialog-worklog-export.component.html',
  styleUrls: ['./dialog-worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogWorklogExportComponent {
  T = T;
  options: WorklogExportSettingsCopy = WORKLOG_EXPORT_DEFAULTS;
  strStart: string;
  strEnd: string;

  constructor(
    private _matDialogRef: MatDialogRef<DialogWorklogExportComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    // this.strStart = getWorklogStr(data.rangeStart);
    // this.strEnd = getWorklogStr(data.rangeEnd);
    this.strStart = moment(data.rangeStart).format('l');
    this.strEnd = moment(data.rangeEnd).format('l');
  }

  close() {
    this._matDialogRef.close();
  }
}
