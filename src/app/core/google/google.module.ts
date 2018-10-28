import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleSyncCfgComponent } from './google-sync-cfg/google-sync-cfg.component';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
  ],
  declarations: [GoogleSyncCfgComponent],
  exports: [GoogleSyncCfgComponent]
})
export class GoogleModule { }
