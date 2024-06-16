import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { DEFAULT_REDMINE_CFG, REDMINE_CONFIG_FORM } from '../../redmine.const';
import { RedmineCfg } from '../../redmine.model';

@Component({
  selector: 'dialog-redmine-initial-setup',
  templateUrl: './dialog-redmine-initial-setup.component.html',
  styleUrls: ['./dialog-redmine-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogRedmineInitialSetupComponent {
  T: typeof T = T;
  redmineCfg: RedmineCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = REDMINE_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRed: MatDialogRef<DialogRedmineInitialSetupComponent>,
  ) {
    this.redmineCfg = this.data.redmineCfg || DEFAULT_REDMINE_CFG;
  }

  saveRedmineCfg(redmineCfg: RedmineCfg): void {
    this._matDialogRed.close(redmineCfg);
  }

  close(): void {
    this._matDialogRed.close();
  }
}
