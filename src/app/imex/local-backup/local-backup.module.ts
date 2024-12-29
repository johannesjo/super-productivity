import { NgModule, inject } from '@angular/core';
import { LocalBackupService } from './local-backup.service';
import { IS_ELECTRON } from '../../app.constants';
import { EffectsModule } from '@ngrx/effects';
import { LocalBackupEffects } from './local-backup.effects';
import { IS_ANDROID_BACKUP_READY } from '../../features/android/android-interface';

@NgModule({
  providers: [LocalBackupService],
  imports: [EffectsModule.forFeature([LocalBackupEffects])],
})
export class LocalBackupModule {
  private _localBackupService = inject(LocalBackupService);

  constructor() {
    if (IS_ELECTRON || IS_ANDROID_BACKUP_READY) {
      this._localBackupService.init();
    }
  }
}
