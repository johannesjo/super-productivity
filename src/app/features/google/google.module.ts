import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { DialogGoogleExportTimeComponent } from './dialog-google-export-time/dialog-google-export-time.component';
import { DialogConfirmDriveSyncLoadComponent } from './dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { DialogConfirmDriveSyncSaveComponent } from './dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import { GoogleExportTimeComponent } from './google-export-time/google-export-time.component';
import { EffectsModule } from '@ngrx/effects';
import { GoogleDriveSyncEffects } from './store/google-drive-sync.effects';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    EffectsModule.forFeature([GoogleDriveSyncEffects]),
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
})
export class GoogleModule {
}
