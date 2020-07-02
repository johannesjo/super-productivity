import { NgModule } from '@angular/core';
import { LocalBackupService } from './local-backup.service';
import { IS_ELECTRON } from '../../app.constants';

@NgModule({
  providers: [LocalBackupService],
})
export class LocalBackupModule {
  constructor(private _localBackupService: LocalBackupService) {
    if (IS_ELECTRON) {
      this._localBackupService.init();
    }
  }

}
