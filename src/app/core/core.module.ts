import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ConfigModule } from './config/config.module';
import { ChromeExtensionInterfaceModule } from './chrome-extension-interface/chrome-extension-interface.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ShortcutModule } from './shortcut/shortcut.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    TimeTrackingModule,
    ShortcutModule,
  ],
  declarations: []
})
export class CoreModule { }
