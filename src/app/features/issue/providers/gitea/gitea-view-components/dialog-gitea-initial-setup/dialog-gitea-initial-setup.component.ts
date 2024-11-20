import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = GITEA_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogGiteaInitialSetupComponent>,
  ) {
    this.giteaCfg = this.data.cfg || DEFAULT_GITEA_CFG;
  }

  saveGiteaCfg(giteaCfg: GiteaCfg): void {
    this._matDialogRef.close(giteaCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
