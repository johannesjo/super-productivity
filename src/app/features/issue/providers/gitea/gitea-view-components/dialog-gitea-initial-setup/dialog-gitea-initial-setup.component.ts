import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { DEFAULT_GITEA_CFG, GITEA_CONFIG_FORM } from '../../gitea.const';
import { GiteaCfg } from '../../gitea.model';

@Component({
  selector: 'dialog-gitea-initial-setup',
  templateUrl: './dialog-gitea-initial-setup.component.html',
  styleUrls: ['./dialog-gitea-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGiteaInitialSetupComponent {
  T: typeof T = T;
  giteaCfg: GiteaCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = GITEA_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGiteaInitialSetupComponent>,
  ) {
    this.giteaCfg = this.data.giteaCfg || DEFAULT_GITEA_CFG;
  }

  saveGiteaCfg(giteaCfg: GiteaCfg): void {
    this._matDialogRef.close(giteaCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
