import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { JiraCfg } from '../../jira.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-jira-initial-setup',
  templateUrl: './dialog-jira-initial-setup.component.html',
  styleUrls: ['./dialog-jira-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraInitialSetupComponent {
  T: typeof T = T;
  jiraCfg: JiraCfg;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogJiraInitialSetupComponent>,
  ) {
    this.jiraCfg = this.data.jiraCfg;
  }

  saveJiraCfg(cfg: JiraCfg) {
    this._matDialogRef.close({
      ...cfg,
      isEnabled: !!(cfg && cfg.host && cfg.userName && cfg.password),
    });
  }
}
