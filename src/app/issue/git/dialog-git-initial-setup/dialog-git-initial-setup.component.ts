import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { GitCfg } from '../git';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DEFAULT_GIT_CFG, GIT_CONFIG_FORM } from '../git.const';

@Component({
  selector: 'dialog-git-initial-setup',
  templateUrl: './dialog-git-initial-setup.component.html',
  styleUrls: ['./dialog-git-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGitInitialSetupComponent implements OnInit {
  gitCfg: GitCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = GIT_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGitInitialSetupComponent>,
  ) {
    this.gitCfg = this.data.gitCfg || DEFAULT_GIT_CFG;
  }

  ngOnInit() {
  }

  saveGitCfg($event) {
    this._matDialogRef.close($event);
  }

  close() {
    this._matDialogRef.close();
  }
}
