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
import { SyncConfigService } from '../sync-config.service';
import { SyncService } from '../sync.service';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { SyncProviderId } from '../../../pfapi/api';

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
  syncConfigService = inject(SyncConfigService);
  syncService = inject(SyncService);

  T = T;
  SYNC_FORM = SYNC_FORM;
  fields = [
    SYNC_FORM.items!.find((it) => it.key === 'syncProvider'),
    ...SYNC_FORM.items!.filter((f) => f.key !== 'isEnabled' && f.key !== 'syncProvider'),
  ];
  form = new FormGroup({});
  _tmpUpdatedCfg?: SyncConfig;

  private _matDialogRef =
    inject<MatDialogRef<DialogSyncInitialCfgComponent>>(MatDialogRef);

  private _subs = new Subscription();

  constructor() {
    this._subs.add(
      this.syncConfigService.syncSettingsForm$.pipe(first()).subscribe((v) => {
        this.updateTmpCfg({
          ...v,
          isEnabled: true,
        });
      }),
    );
  }

  close(): void {
    this._matDialogRef.close();
  }

  async save(): Promise<void> {
    if (this._tmpUpdatedCfg) {
      await this.syncConfigService.updateSettingsFromForm(
        {
          ...this._tmpUpdatedCfg,
          isEnabled: true,
        },
        true,
      );
      if (this._tmpUpdatedCfg.syncProvider) {
        this.syncService.configuredAuthForSyncProviderIfNecessary(
          this._tmpUpdatedCfg.syncProvider as unknown as SyncProviderId,
        );
      }

      this._matDialogRef.close();
    } else {
      throw new Error('No tmpCfg');
    }
  }

  updateTmpCfg(cfg: SyncConfig): void {
    this._tmpUpdatedCfg = cfg;
  }
}
