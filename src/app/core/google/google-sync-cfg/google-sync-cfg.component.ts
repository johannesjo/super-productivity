import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { SnackService } from '../../snack/snack.service';
import { GoogleDriveSyncConfig } from '../../config/config.model';

@Component({
  selector: 'google-sync-cfg',
  templateUrl: './google-sync-cfg.component.html',
  styleUrls: ['./google-sync-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleSyncCfgComponent implements OnInit {
  // TODO get current value
  public tmpSyncFile: any;
  public cfg: GoogleDriveSyncConfig;

  constructor(
    public readonly googleApiService: GoogleApiService,
    private readonly _googleDriveSyncService: GoogleDriveSyncService,
    private readonly _configService: ConfigService,
    private readonly _snackService: SnackService,
  ) {
  }

  ngOnInit() {
    this._configService.cfg$.subscribe((cfg) => {
      this.cfg = cfg;
    });
  }

  save() {
    this._configService.updateSection('googleDriveSync', this.cfg);
  }

  // import/export stuff
  importSettings(uploadSettingsTextarea) {
    // let settings = JSON.parse(uploadSettingsTextarea);
    // AppStorage.importData(settings);
  }

  backupNow() {
    return this._googleDriveSyncService.saveTo()
      .then(() => {
        this._snackService.open({
          type: 'SUCCESS',
          message: 'Google Drive: Successfully saved backup'
        });
      });
  }

  loadRemoteData() {
    return this._googleDriveSyncService.loadFrom();
  }

  login() {
    return this.googleApiService.login();
  }

  logout() {
    return this.googleApiService.logout();
  }

  onGoogleDriveSyncToggle(isEnabled) {
    if (isEnabled) {
      this._googleDriveSyncService.resetAutoSyncToRemoteInterval();
    } else {
      this._googleDriveSyncService.cancelAutoSyncToRemoteIntervalIfSet();
    }
  }

  onLocalSyncToggle(isEnabled) {
    if (isEnabled) {
      // AppStorage.resetAutoSyncToRemoteInterval();
    } else {
      // AppStorage.cancelAutoSyncToRemoteIntervalIfSet();
    }
  }

  resetSync() {
    this._googleDriveSyncService.resetAutoSyncToRemoteInterval();
  }

  changeSyncFileName(newSyncFile) {
    this._googleDriveSyncService.changeSyncFileName(newSyncFile);
  }
}
