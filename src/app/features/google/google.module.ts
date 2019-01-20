import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { DialogGoogleExportTimeComponent } from './dialog-google-export-time/dialog-google-export-time.component';
import { DialogConfirmDriveSyncLoadComponent } from './dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { DialogConfirmDriveSyncSaveComponent } from './dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import { GoogleDriveSyncService } from './google-drive-sync.service';
import { GoogleApiService } from './google-api.service';
import { SyncModule } from '../../imex/sync/sync.module';
import { CoreModule } from '../../core/core.module';
import { GoogleExportTimeComponent } from './google-export-time/google-export-time.component';
import { EffectsModule } from '@ngrx/effects';
import { GoogleDriveSyncEffects } from './store/google-drive-sync.effects';
import { StoreModule } from '@ngrx/store';
import * as fromGoogleDriveSync from './store/google-drive-sync.reducer';
import { GOOGLE_DRIVE_FEATURE_NAME } from './store/google-drive-sync.reducer';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    SyncModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([GoogleDriveSyncEffects]),
    StoreModule.forFeature(GOOGLE_DRIVE_FEATURE_NAME, fromGoogleDriveSync.reducer),
  ],
  declarations: [
    DialogGoogleExportTimeComponent,
    DialogConfirmDriveSyncLoadComponent,
    DialogConfirmDriveSyncSaveComponent,
    GoogleExportTimeComponent,
  ],
  entryComponents: [
    DialogGoogleExportTimeComponent,
    DialogConfirmDriveSyncLoadComponent,
    DialogConfirmDriveSyncSaveComponent,
  ],
  exports: [
    GoogleExportTimeComponent,
  ],
  providers: [
    GoogleDriveSyncService,
    GoogleApiService,
  ]
})
export class GoogleModule {
}
