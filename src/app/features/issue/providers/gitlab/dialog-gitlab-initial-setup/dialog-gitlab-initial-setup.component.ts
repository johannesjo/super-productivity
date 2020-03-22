import { Component, OnInit, ChangeDetectionStrategy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { GitlabCfg } from '../gitlab';
import { GITLAB_CONFIG_FORM, DEFAULT_GITLAB_CFG } from '../gitlab.const';

@Component({
  selector: 'dialog-gitlab-initial-setup',
  templateUrl: './dialog-gitlab-initial-setup.component.html',
  styleUrls: ['./dialog-gitlab-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGitlabInitialSetupComponent implements OnInit {
  T = T;
  gitlabCfg: GitlabCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = GITLAB_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGitlabInitialSetupComponent>,
  ) {
    this.gitlabCfg = this.data.gitlabCfg || DEFAULT_GITLAB_CFG;
  }

  ngOnInit() {
  }

  saveGitlabCfg($event) {
    this._matDialogRef.close($event);
  }

  close() {
    this._matDialogRef.close();
  }
}
