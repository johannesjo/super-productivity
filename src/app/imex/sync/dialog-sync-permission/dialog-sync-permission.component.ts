import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { T } from 'src/app/t.const';
import { androidInterface } from '../../../features/android/android-interface';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Component({
  selector: 'dialog-sync-permission',
  templateUrl: './dialog-sync-permission.component.html',
  styleUrls: ['./dialog-sync-permission.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogSyncPermissionComponent {
  T: typeof T = T;

  constructor(
    private _matDialogRef: MatDialogRef<DialogSyncPermissionComponent>,
    private _globalConfigService: GlobalConfigService,
  ) {
    _matDialogRef.disableClose = true;
  }

  grantPermission(): void {
    androidInterface.grantFilePermissionWrapped().then(() => {
      if (androidInterface.isGrantedFilePermission()) {
        this._matDialogRef.close('GRANTED_PERMISSION');
      }
    });
  }

  disableSync(): void {
    this._globalConfigService.updateSection('sync', { isEnabled: false });
    this._matDialogRef.close('DISABLED_SYNC');
  }
}
