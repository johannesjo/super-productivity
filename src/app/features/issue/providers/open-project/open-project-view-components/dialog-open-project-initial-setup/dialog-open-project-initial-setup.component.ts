import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OpenProjectCfg } from '../../open-project.model';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import {
  DEFAULT_OPEN_PROJECT_CFG,
  OPEN_PROJECT_CONFIG_FORM,
} from '../../open-project.const';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-open-project-initial-setup',
  templateUrl: './dialog-open-project-initial-setup.component.html',
  styleUrls: ['./dialog-open-project-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogOpenProjectInitialSetupComponent {
  T: typeof T = T;
  openProjectCfg: OpenProjectCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = OPEN_PROJECT_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogOpenProjectInitialSetupComponent>,
  ) {
    this.openProjectCfg = this.data.openProjectCfg || DEFAULT_OPEN_PROJECT_CFG;
  }

  saveOpenProjectCfg(gitCfg: OpenProjectCfg): void {
    this._matDialogRef.close(gitCfg);
  }

  close(): void {
    this._matDialogRef.close();
  }
}
