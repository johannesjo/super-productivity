import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { SnackService } from '../../snack/snack.service';
import { GoogleDriveSyncConfig } from '../../config/config.model';
import { Subscription } from 'rxjs';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';

@Component({
  selector: 'google-sync-cfg',
  templateUrl: './google-sync-cfg.component.html',
  styleUrls: ['./google-sync-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation]
})
export class GoogleSyncCfgComponent implements OnInit, OnDestroy {
  tmpSyncFile: any;
  cfg: GoogleDriveSyncConfig;
  backupPromise: Promise<any>;
  loadRemotePromise: Promise<any>;
  loginPromise: Promise<any>;

  @Output() save = new EventEmitter<any>();

  private _subs = new Subscription();

  constructor(
    public readonly googleApiService: GoogleApiService,
    private readonly _googleDriveSyncService: GoogleDriveSyncService,
    private readonly _configService: ConfigService,
    private readonly _snackService: SnackService,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._configService.cfg$.subscribe((cfg) => {
      this.cfg = cfg.googleDriveSync;
      this.tmpSyncFile = cfg.googleDriveSync.syncFileName;
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  submit() {
    this._configService.updateSection('googleDriveSync', this.cfg);
    this.save.emit();
  }

  // import/export stuff
  importSettings(uploadSettingsTextarea) {
    // let settings = JSON.parse(uploadSettingsTextarea);
    // AppStorage.importData(settings);
  }

  backupNow() {
    this.backupPromise = this._googleDriveSyncService.saveTo()
      .then(() => {
        this._snackService.open({
          type: 'SUCCESS',
          message: 'Google Drive: Successfully saved backup'
        });
      });
  }

  loadRemoteData() {
    this.loadRemotePromise = this._googleDriveSyncService.loadFrom();
  }

  login() {
    this.loginPromise = this.googleApiService.login();
  }

  logout() {
    this.googleApiService.logout();
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
