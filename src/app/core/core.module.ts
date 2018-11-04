import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ConfigModule } from './config/config.module';
import { ChromeExtensionInterfaceModule } from './chrome-extension-interface/chrome-extension-interface.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ShortcutModule } from './shortcut/shortcut.module';
import { SnackModule } from './snack/snack.module';
import { GoogleModule } from './google/google.module';
import { RouterModule } from '@angular/router';
import { LayoutModule } from './layout/layout.module';
import { DialogSimpleTaskSummaryModule } from './dialog-simple-task-summary/dialog-simple-task-summary.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    TimeTrackingModule,
    ShortcutModule,
    SnackModule,
    GoogleModule,
    RouterModule,
    LayoutModule,
    DialogSimpleTaskSummaryModule,
  ],
  declarations: [],
  exports: [
    ConfigModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    TimeTrackingModule,
    ShortcutModule,
    SnackModule,
    GoogleModule,
    RouterModule,
    DialogSimpleTaskSummaryModule,
  ]
})
export class CoreModule {
}
