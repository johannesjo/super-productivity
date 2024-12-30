import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { CommonModule } from '@angular/common';
import { WebDavModule } from './web-dav/web-dav.module';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogSyncPermissionComponent } from './dialog-sync-permission/dialog-sync-permission.component';
import { DialogGetAndEnterAuthCodeComponent } from './dialog-get-and-enter-auth-code/dialog-get-and-enter-auth-code.component';

@NgModule({
  declarations: [
    DialogSyncConflictComponent,
    DialogGetAndEnterAuthCodeComponent,
    DialogSyncPermissionComponent,
  ],
  imports: [FormsModule, UiModule, CommonModule, WebDavModule],
})
export class SyncModule {}
