import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GithubCfg } from '../../github.model';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM } from '../../github.const';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-github-initial-setup',
  templateUrl: './dialog-github-initial-setup.component.html',
  styleUrls: ['./dialog-github-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGithubInitialSetupComponent implements OnInit {
  T: typeof T = T;
  githubCfg: GithubCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = GITHUB_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGithubInitialSetupComponent>,
  ) {
    this.githubCfg = this.data.githubCfg || DEFAULT_GITHUB_CFG;
  }

  ngOnInit() {
  }

  saveGithubCfg(gitCfg: GithubCfg) {
    this._matDialogRef.close(gitCfg);
  }

  close() {
    this._matDialogRef.close();
  }
}
