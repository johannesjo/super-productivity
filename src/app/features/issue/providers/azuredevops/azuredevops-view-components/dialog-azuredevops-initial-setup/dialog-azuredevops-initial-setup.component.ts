import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AzuredevopsCfg } from '../../azuredevops.model';
import { UntypedFormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import {
  DEFAULT_AZUREDEVOPS_CFG,
  AZUREDEVOPS_CONFIG_FORM,
} from '../../azuredevops.const';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-azuredevops-initial-setup',
  templateUrl: './dialog-azuredevops-initial-setup.component.html',
  styleUrls: ['./dialog-azuredevops-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAzuredevopsInitialSetupComponent {
  T: typeof T = T;
  azuredevopsCfg: AzuredevopsCfg;
  formGroup: UntypedFormGroup = new UntypedFormGroup({});
  formConfig: FormlyFieldConfig[] = AZUREDEVOPS_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogAzuredevopsInitialSetupComponent>,
  ) {
    this.azuredevopsCfg = this.data.azuredevopsCfg || DEFAULT_AZUREDEVOPS_CFG;
  }

  saveAzuredevopsCfg(gitCfg: AzuredevopsCfg): void {
    this._matDialogRef.close(gitCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
