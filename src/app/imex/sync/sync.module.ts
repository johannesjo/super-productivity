import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { CommonModule } from '@angular/common';
import { DropboxModule } from './dropbox/dropbox.module';
import { GoogleModule } from './google/google.module';
import { WebDavModule } from './web-dav/web-dav.module';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogGetAndEnterAuthCodeComponent } from './dialog-get-and-enter-auth-code/dialog-get-and-enter-auth-code.component';

@NgModule({
  declarations: [DialogSyncConflictComponent, DialogGetAndEnterAuthCodeComponent],
  imports: [
    FormsModule,
    UiModule,
    ConfigModule,
    EffectsModule.forFeature([SyncEffects]),
    CommonModule,
    DropboxModule,
    GoogleModule,
    WebDavModule,
  ],
})
export class SyncModule {}
