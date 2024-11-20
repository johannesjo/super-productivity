import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { GitlabCfg } from '../gitlab';
import { DEFAULT_GITLAB_CFG, GITLAB_CONFIG_FORM } from '../gitlab.const';

@Component({
  selector: 'dialog-gitlab-initial-setup',
  templateUrl: './dialog-gitlab-initial-setup.component.html',
  styleUrls: ['./dialog-gitlab-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGitlabInitialSetupComponent {
  T: typeof T = T;
  gitlabCfg: GitlabCfg;
  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = GITLAB_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGitlabInitialSetupComponent>,
  ) {
    this.gitlabCfg = this.data.cfg || DEFAULT_GITLAB_CFG;
  }

  saveGitlabCfg(gitlabCfg: GitlabCfg): void {
    this._matDialogRef.close(gitlabCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
