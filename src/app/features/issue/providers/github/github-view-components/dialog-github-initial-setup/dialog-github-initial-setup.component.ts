import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GithubCfg } from '../../github.model';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM } from '../../github.const';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-github-initial-setup',
  templateUrl: './dialog-github-initial-setup.component.html',
  styleUrls: ['./dialog-github-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGithubInitialSetupComponent {
  T: typeof T = T;
  githubCfg: GithubCfg;
  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = GITHUB_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGithubInitialSetupComponent>,
  ) {
    this.githubCfg = this.data.githubCfg || DEFAULT_GITHUB_CFG;
  }

  saveGithubCfg(gitCfg: GithubCfg): void {
    this._matDialogRef.close(gitCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
