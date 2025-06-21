import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { WorklogExportSettingsCopy } from '../worklog.model';
import { T } from '../../../t.const';
import { WORKLOG_EXPORT_DEFAULTS } from '../../work-context/work-context.const';
import { WorklogExportComponent } from '../worklog-export/worklog-export.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-worklog-export',
  templateUrl: './dialog-worklog-export.component.html',
  styleUrls: ['./dialog-worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogTitle, WorklogExportComponent, TranslatePipe],
})
export class DialogWorklogExportComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogWorklogExportComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  T: typeof T = T;
  options: WorklogExportSettingsCopy = WORKLOG_EXPORT_DEFAULTS;
  strStart: string;
  strEnd: string;
  isSingleDay: boolean = false;

  constructor() {
    const data = this.data;

    // this.strStart = getWorklogStr(data.rangeStart);
    // this.strEnd = getWorklogStr(data.rangeEnd);
    this.strStart = new Date(data.rangeStart).toLocaleDateString();
    this.strEnd = new Date(data.rangeEnd).toLocaleDateString();

    this.isSingleDay = this.strStart === this.strEnd;
  }

  close(): void {
    this._matDialogRef.close();
  }
}
