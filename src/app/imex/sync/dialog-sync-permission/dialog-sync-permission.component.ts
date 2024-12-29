import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { androidInterface } from '../../../features/android/android-interface';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Component({
  selector: 'dialog-sync-permission',
  templateUrl: './dialog-sync-permission.component.html',
  styleUrls: ['./dialog-sync-permission.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DialogSyncPermissionComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogSyncPermissionComponent>>(MatDialogRef);
  private _globalConfigService = inject(GlobalConfigService);

  T: typeof T = T;

  constructor() {
    const _matDialogRef = this._matDialogRef;

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
