import { NgModule } from '@angular/core';
import { LocalBackupService } from './local-backup.service';
import { IS_ELECTRON } from '../../app.constants';
import { EffectsModule } from '@ngrx/effects';
import { LocalBackupEffects } from './local-backup.effects';
import { IS_ANDROID_BACKUP_READY } from '../../core/android/android-interface';

@NgModule({
  providers: [LocalBackupService],
  imports: [EffectsModule.forFeature([LocalBackupEffects])],
})
export class LocalBackupModule {
  constructor(private _localBackupService: LocalBackupService) {
    if (IS_ELECTRON || IS_ANDROID_BACKUP_READY) {
      this._localBackupService.init();
    }
  }
}
