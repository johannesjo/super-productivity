import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PlatformCode } from '../../../core/util/generate-client-id';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';
import {
  SuperSyncDevicesService,
  SyncDeviceListEntry,
} from '../super-sync-devices.service';
import { T } from '../../../t.const';

interface DeviceRow extends SyncDeviceListEntry {
  icon: string;
  label: string;
}

/** How each clientId prefix is presented. Keyed by `PlatformCode` so a new code is a compile error. */
const PLATFORMS: Record<PlatformCode, { icon: string; label: string }> = {
  E: { icon: 'computer', label: T.F.SYNC.D_DEVICES.PLATFORM_DESKTOP },
  A: { icon: 'smartphone', label: T.F.SYNC.D_DEVICES.PLATFORM_ANDROID },
  I: { icon: 'smartphone', label: T.F.SYNC.D_DEVICES.PLATFORM_IOS },
  B: { icon: 'public', label: T.F.SYNC.D_DEVICES.PLATFORM_BROWSER },
};

const UNKNOWN_PLATFORM = {
  icon: 'devices_other',
  label: T.F.SYNC.D_DEVICES.PLATFORM_UNKNOWN,
};

@Component({
  selector: 'dialog-sync-devices',
  templateUrl: './dialog-sync-devices.component.html',
  styleUrls: ['./dialog-sync-devices.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    TranslateModule,
    LocaleDatePipe,
    MatIcon,
    MatProgressSpinner,
  ],
})
export class DialogSyncDevicesComponent implements OnInit {
  private _devicesService = inject(SuperSyncDevicesService);

  T = T;

  devices = signal<DeviceRow[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const devices = await this._devicesService.getDevices();
      // Resolved here rather than in the template: the row list is rebuilt once,
      // a template call would re-run per row on every change-detection pass.
      this.devices.set(
        devices.map((device) => ({
          ...device,
          ...(device.platform ? PLATFORMS[device.platform] : UNKNOWN_PLATFORM),
        })),
      );
    } catch {
      this.error.set(T.F.SYNC.D_DEVICES.ERROR_LOADING);
    } finally {
      this.isLoading.set(false);
    }
  }
}
