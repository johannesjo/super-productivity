import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { GitlabCfg } from '../gitlab';
import { DEFAULT_GITLAB_CFG, GITLAB_CONFIG_FORM } from '../gitlab.const';

@Component({
  selector: 'dialog-gitlab-initial-setup',
  templateUrl: './dialog-gitlab-initial-setup.component.html',
  styleUrls: ['./dialog-gitlab-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGitlabInitialSetupComponent implements OnInit {
  T: typeof T = T;
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

  saveGitlabCfg(gitlabCfg: GitlabCfg) {
    this._matDialogRef.close(gitlabCfg);
  }

  close() {
    this._matDialogRef.close();
  }
}
