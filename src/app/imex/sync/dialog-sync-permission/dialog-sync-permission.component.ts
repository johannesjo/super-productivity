import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { T } from 'src/app/t.const';
import { androidInterface } from '../../../features/android/android-interface';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'dialog-sync-permission',
  templateUrl: './dialog-sync-permission.component.html',
  styleUrls: ['./dialog-sync-permission.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
  ],
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
