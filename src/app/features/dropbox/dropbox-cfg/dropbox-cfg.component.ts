import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {GlobalConfigService} from '../../config/global-config.service';
import {DropboxSyncConfig} from '../../config/global-config.model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {T} from 'src/app/t.const';

@Component({
  selector: 'dropbox-cfg',
  templateUrl: './dropbox-cfg.component.html',
  styleUrls: ['./dropbox-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropboxCfgComponent {
  T = T;
  cfg$: Observable<DropboxSyncConfig> = this._configService.cfg$.pipe(
    map(cfg => cfg.dropboxSync)
  );

  @Output() save = new EventEmitter<any>();

  constructor(
    private readonly _configService: GlobalConfigService,
  ) {
  }


  toggleEnabled(isEnabled: boolean) {
    this._configService.updateSection('googleDriveSync', {
      isEnabled,
    });
  }
}
