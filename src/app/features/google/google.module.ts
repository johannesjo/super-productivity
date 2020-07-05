import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { DialogConfirmDriveSyncLoadComponent } from './dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { DialogConfirmDriveSyncSaveComponent } from './dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import { EffectsModule } from '@ngrx/effects';
import { GoogleDriveSyncEffects } from './store/google-drive-sync.effects';
import { StoreModule } from '@ngrx/store';
import * as fromGoogleDriveSync from './store/google-drive-sync.reducer';
import { GOOGLE_DRIVE_FEATURE_NAME } from './store/google-drive-sync.reducer';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([GoogleDriveSyncEffects]),
    StoreModule.forFeature(GOOGLE_DRIVE_FEATURE_NAME, fromGoogleDriveSync.reducer),
  ],
  declarations: [
    DialogConfirmDriveSyncLoadComponent,
    DialogConfirmDriveSyncSaveComponent,
  ],
  exports: [],
})
export class GoogleModule {
}
