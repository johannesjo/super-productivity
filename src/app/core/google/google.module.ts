import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleSyncCfgComponent } from './google-sync-cfg/google-sync-cfg.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { DialogGoogleExportTimeComponent } from './dialog-google-export-time/dialog-google-export-time.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
  ],
  declarations: [GoogleSyncCfgComponent, DialogGoogleExportTimeComponent],
  exports: [GoogleSyncCfgComponent],
  entryComponents: [DialogGoogleExportTimeComponent]
})
export class GoogleModule {
}
