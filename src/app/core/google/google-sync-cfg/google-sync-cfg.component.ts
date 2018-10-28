import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';

@Component({
  selector: 'google-sync-cfg',
  templateUrl: './google-sync-cfg.component.html',
  styleUrls: ['./google-sync-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleSyncCfgComponent implements OnInit {
  public cfg: any = {};
  public tmpSyncFile: any;

  constructor(public readonly googleApiService: GoogleApiService,
              private readonly _configService: ConfigService) {
  }

  ngOnInit() {
    this._configService.cfg$.subscribe((cfg) => {
      console.log(cfg);

    });
  }

  // import/export stuff
  importSettings = (uploadSettingsTextarea) => {
    // let settings = JSON.parse(uploadSettingsTextarea);
    // AppStorage.importData(settings);
  };

  backupNow() {
    // return GoogleDriveSync.saveTo()
    //   .then(() => {
    //     SimpleToast('SUCCESS', 'Google Drive: Successfully saved backup');
    //   });
  }

  loadRemoteData() {
    // return GoogleDriveSync.loadFrom();
  }

  login() {
    return this.googleApiService.login();
  }

  logout() {
    return this.googleApiService.logout();
  }

  onGoogleDriveSyncToggle = (isEnabled) => {
    if (isEnabled) {
      // GoogleDriveSync.resetAutoSyncToRemoteInterval();
    } else {
      // GoogleDriveSync.cancelAutoSyncToRemoteIntervalIfSet();
    }
  }

  onLocalSyncToggle = (isEnabled) => {
    if (isEnabled) {
      // AppStorage.resetAutoSyncToRemoteInterval();
    } else {
      // AppStorage.cancelAutoSyncToRemoteIntervalIfSet();
    }
  }

  resetSync() {
    // GoogleDriveSync.resetAutoSyncToRemoteInterval();
  }

  changeSyncFileName = (newSyncFile) => {
    // GoogleDriveSync.changeSyncFileName(newSyncFile);
  }
}
