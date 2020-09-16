import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { GoogleApiService } from '../google-api.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { GoogleDriveSyncConfig } from '../../config/global-config.model';
import { Subscription } from 'rxjs';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { FormGroup } from '@angular/forms';
import { T } from '../../../t.const';

@Component({
  selector: 'google-sync-cfg',
  templateUrl: './google-sync-cfg.component.html',
  styleUrls: ['./google-sync-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation]
})
export class GoogleSyncCfgComponent implements OnInit, OnDestroy {
  T: typeof T = T;
  tmpSyncFile: any;
  cfg?: GoogleDriveSyncConfig;
  loginPromise?: Promise<any>;

  @ViewChild('formRef', {static: true}) formRef?: FormGroup;

  @Output() save: EventEmitter<any> = new EventEmitter();

  private _subs: Subscription = new Subscription();

  constructor(
    public readonly googleApiService: GoogleApiService,
    public readonly googleDriveSyncService: GoogleDriveSyncService,
    private readonly _configService: GlobalConfigService,
    private readonly _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    this._subs.add(this._configService.googleDriveSyncCfg$.subscribe((cfg) => {
      this.cfg = {...cfg};
      this.tmpSyncFile = this.cfg.syncFileName;
      this._cd.detectChanges();
    }));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  submit() {
    const f = this.formRef;
    if (!f) {
      throw new Error();
    }

    if (f.valid) {
      this.save.emit({
        sectionKey: 'googleDriveSync',
        config: this.cfg,
      });
    } else {
      Object.keys(f.controls)
        .forEach(fieldName =>
          f.controls[fieldName].markAsDirty()
        );
    }
  }

  saveToGoogleDrive() {
    this.googleDriveSyncService.saveTo();
  }

  loadFromGoogleDrive() {
    this.googleDriveSyncService.loadFrom();
  }

  login() {
    this.loginPromise = this.googleApiService.login();
  }

  logout() {
    this.googleApiService.logout();
  }

  changeSyncFileName(newSyncFile: string) {
    this.googleDriveSyncService.changeSyncFileName(newSyncFile);
  }

  toggleEnabled(isEnabled: boolean) {
    this._configService.updateSection('googleDriveSync', {
      isEnabled,
    });
  }
}
