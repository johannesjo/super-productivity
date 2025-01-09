import { inject, NgModule } from '@angular/core';
import { LocalBackupService } from './local-backup.service';
import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_BACKUP_READY } from '../../features/android/android-interface';

@NgModule({
  // TODO check if this is instantiated correctly
  providers: [LocalBackupService],
  imports: [],
})
export class LocalBackupModule {
  private _localBackupService = inject(LocalBackupService);

  constructor() {
    if (IS_ELECTRON || IS_ANDROID_BACKUP_READY) {
      this._localBackupService.init();
    }
  }
}
