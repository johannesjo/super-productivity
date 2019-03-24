import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { GithubCfg } from '../github';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM } from '../github.const';

@Component({
  selector: 'dialog-github-initial-setup',
  templateUrl: './dialog-github-initial-setup.component.html',
  styleUrls: ['./dialog-github-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogGithubInitialSetupComponent implements OnInit {
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

  saveGithubCfg($event) {
    this._matDialogRef.close($event);
  }

  close() {
    this._matDialogRef.close();
  }
}
