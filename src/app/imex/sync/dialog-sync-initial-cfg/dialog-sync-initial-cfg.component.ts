import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { SyncWrapperService } from '../sync-wrapper.service';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { SyncProviderId } from '../../../pfapi/api';
import { SyncLog } from '../../../core/log';

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
  syncWrapperService = inject(SyncWrapperService);

  T = T;
  isWasEnabled = signal(false);
  fields = signal([...SYNC_FORM.items!.filter((f) => f.key !== 'isEnabled')]);
  form = new FormGroup({});
  _tmpUpdatedCfg: SyncConfig = {
    isEnabled: true,
    syncProvider: null,
    syncInterval: 300000,
    encryptKey: '',
    localFileSync: {},
    webDav: {},
  };

  private _matDialogRef =
    inject<MatDialogRef<DialogSyncInitialCfgComponent>>(MatDialogRef);

  private _subs = new Subscription();

  constructor() {
    this._subs.add(
      this.syncConfigService.syncSettingsForm$.pipe(first()).subscribe((v) => {
        if (v.isEnabled) {
          this.isWasEnabled.set(true);
          this.fields.set([...SYNC_FORM.items!]);
        }
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
    // Check if form is valid
    if (!this.form.valid) {
      // Mark all fields as touched to show validation errors
      this.form.markAllAsTouched();
      SyncLog.err('Sync form validation failed', this.form.errors);
      return;
    }

    await this.syncConfigService.updateSettingsFromForm(
      {
        ...this._tmpUpdatedCfg,
        isEnabled: this._tmpUpdatedCfg.isEnabled || !this.isWasEnabled(),
      },
      true,
    );
    if (this._tmpUpdatedCfg.syncProvider && this._tmpUpdatedCfg.isEnabled) {
      this.syncWrapperService.configuredAuthForSyncProviderIfNecessary(
        this._tmpUpdatedCfg.syncProvider as unknown as SyncProviderId,
      );
    }

    this._matDialogRef.close();
  }

  updateTmpCfg(cfg: SyncConfig): void {
    this._tmpUpdatedCfg = cfg;
  }
}
