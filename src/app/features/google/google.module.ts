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

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    SyncModule,
    FormsModule,
    UiModule,
  ],
  declarations: [
    DialogGoogleExportTimeComponent,
    DialogConfirmDriveSyncLoadComponent,
    DialogConfirmDriveSyncSaveComponent,
  ],
  entryComponents: [
    DialogGoogleExportTimeComponent,
    DialogConfirmDriveSyncLoadComponent,
    DialogConfirmDriveSyncSaveComponent,
  ],
  providers: [
    GoogleDriveSyncService,
    GoogleApiService,
  ]
})
export class GoogleModule {
}
