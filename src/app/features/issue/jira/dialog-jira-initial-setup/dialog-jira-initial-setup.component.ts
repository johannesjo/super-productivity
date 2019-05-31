import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { JiraCfg } from '../jira';

@Component({
  selector: 'dialog-jira-initial-setup',
  templateUrl: './dialog-jira-initial-setup.component.html',
  styleUrls: ['./dialog-jira-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogJiraInitialSetupComponent implements OnInit {
  jiraCfg: JiraCfg;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogJiraInitialSetupComponent>,
  ) {
    this.jiraCfg = this.data.jiraCfg;
  }

  ngOnInit() {
  }

  saveJiraCfg($event) {
    this._matDialogRef.close($event);
  }
}
