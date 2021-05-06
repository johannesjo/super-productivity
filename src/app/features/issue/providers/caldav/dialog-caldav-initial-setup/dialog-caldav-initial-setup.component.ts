import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from 'src/app/t.const';
import { CALDAV_CONFIG_FORM, DEFAULT_CALDAV_CFG } from '../caldav.const';
import { CaldavCfg } from '../caldav.model';

@Component({
  selector: 'dialog-caldav-initial-setup',
  templateUrl: './dialog-caldav-initial-setup.component.html',
  styleUrls: ['./dialog-caldav-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCaldavInitialSetupComponent {
  T: typeof T = T;
  caldavCfg: CaldavCfg;
  formGroup: FormGroup = new FormGroup({});
  formConfig: FormlyFieldConfig[] = CALDAV_CONFIG_FORM;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogCaldavInitialSetupComponent>,
  ) {
    this.caldavCfg = this.data.caldavCfg || DEFAULT_CALDAV_CFG;
  }

  saveCaldavCfg(caldavCfg: CaldavCfg) {
    this._matDialogRef.close(caldavCfg);
  }

  close() {
    this._matDialogRef.close();
  }
}
