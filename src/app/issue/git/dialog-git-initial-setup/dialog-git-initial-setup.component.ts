import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { GitCfg } from '../git';

@Component({
  selector: 'dialog-git-initial-setup',
  templateUrl: './dialog-git-initial-setup.component.html',
  styleUrls: ['./dialog-git-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGitInitialSetupComponent implements OnInit {
  gitCfg: GitCfg;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGitInitialSetupComponent>,
  ) {
    this.gitCfg = this.data.gitCfg;
  }

  ngOnInit() {
  }

  saveGitCfg($event) {
    this._matDialogRef.close($event);
  }
}
