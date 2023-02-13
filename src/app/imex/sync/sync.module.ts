import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { SyncEffects } from './sync.effects';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { CommonModule } from '@angular/common';
import { DropboxModule } from './dropbox/dropbox.module';
import { WebDavModule } from './web-dav/web-dav.module';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogSyncPermissionComponent } from './dialog-sync-permission/dialog-sync-permission.component';
import { DialogGetAndEnterAuthCodeComponent } from './dialog-get-and-enter-auth-code/dialog-get-and-enter-auth-code.component';
import { LocalFileSyncModule } from './local-file-sync/local-file-sync.module';

@NgModule({
  declarations: [
    DialogSyncConflictComponent,
    DialogGetAndEnterAuthCodeComponent,
    DialogSyncPermissionComponent,
  ],
  imports: [
    FormsModule,
    UiModule,
    ConfigModule,
    EffectsModule.forFeature([SyncEffects]),
    CommonModule,
    DropboxModule,
    LocalFileSyncModule,
    WebDavModule,
  ],
})
export class SyncModule {}
