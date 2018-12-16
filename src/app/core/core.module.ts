import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ConfigModule } from './config/config.module';
import { ChromeExtensionInterfaceModule } from './chrome-extension-interface/chrome-extension-interface.module';
import { ShortcutModule } from './shortcut/shortcut.module';
import { SnackModule } from './snack/snack.module';
import { GoogleModule } from './google/google.module';
import { RouterModule } from '@angular/router';
import { LayoutModule } from './layout/layout.module';
import { DialogSimpleTaskSummaryModule } from './dialog-simple-task-summary/dialog-simple-task-summary.module';
import { NotifyModule } from './notify/notify.module';
import { MigrateModule } from './migrate/migrate.module';

@NgModule({
  imports: [
    CommonModule,

    ConfigModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    ShortcutModule,
    SnackModule,
    GoogleModule,
    RouterModule,
    LayoutModule,
    NotifyModule,
    MigrateModule,
    DialogSimpleTaskSummaryModule,
  ],
  declarations: [],
  exports: [
    ConfigModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    ShortcutModule,
    SnackModule,
    GoogleModule,
    RouterModule,
    LayoutModule,
    NotifyModule,
    MigrateModule,
    DialogSimpleTaskSummaryModule,
  ]
})
export class CoreModule {
}
