import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ChromeExtensionInterfaceModule } from './chrome-extension-interface/chrome-extension-interface.module';
import { SnackModule } from './snack/snack.module';
import { RouterModule } from '@angular/router';
import { NotifyModule } from './notify/notify.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    SnackModule,
    NotifyModule,
  ],
  declarations: [],
  exports: [
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    SnackModule,
    NotifyModule,
  ],
})
export class CoreModule {
}
