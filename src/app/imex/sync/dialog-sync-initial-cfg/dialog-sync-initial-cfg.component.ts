import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { SYNC_FORM } from '../../../features/config/form-cfgs/sync-form.const';
import { FormGroup } from '@angular/forms';
import { FormlyConfigModule } from '../../../ui/formly-config.module';
import { FormlyModule } from '@ngx-formly/core';
import { SyncConfig } from '../../../features/config/global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from '../../../features/config/default-global-config.const';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Component({
  selector: 'dialog-sync-initial-cfg',
  templateUrl: './dialog-sync-initial-cfg.component.html',
  styleUrls: ['./dialog-sync-initial-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    TranslatePipe,
    FormlyConfigModule,
    FormlyModule,
  ],
})
export class DialogSyncInitialCfgComponent {
  globalConfigService = inject(GlobalConfigService);
  T = T;
  SYNC_FORM = SYNC_FORM;
  fields = [
    SYNC_FORM.items!.find((it) => it.key === 'syncProvider'),
    ...SYNC_FORM.items!.filter((f) => f.key !== 'isEnabled' && f.key !== 'syncProvider'),
  ];
  form = new FormGroup({});
  cfg: SyncConfig = {
    ...DEFAULT_GLOBAL_CONFIG.sync,
    ...this.globalConfigService.cfg?.sync,
    isEnabled: true,
  };

  private _matDialogRef =
    inject<MatDialogRef<DialogSyncInitialCfgComponent>>(MatDialogRef);

  close(): void {
    this._matDialogRef.close();
  }

  save(): void {
    this.globalConfigService.updateSection('sync', this.cfg);
    this._matDialogRef.close();
  }

  updateCfg(d: SyncConfig): void {
    this.cfg = d;
  }
}
