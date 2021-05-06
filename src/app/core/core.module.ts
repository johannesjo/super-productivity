import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ChromeExtensionInterfaceModule } from './chrome-extension-interface/chrome-extension-interface.module';
import { SnackModule } from './snack/snack.module';
import { RouterModule } from '@angular/router';
import { LocalBackupModule } from '../imex/local-backup/local-backup.module';
import { BannerModule } from './banner/banner.module';
import { CompressionModule } from './compression/compression.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    PersistenceModule,
    ChromeExtensionInterfaceModule,
    SnackModule,
    BannerModule,
    LocalBackupModule,
    CompressionModule,
  ],
  exports: [PersistenceModule, ChromeExtensionInterfaceModule, SnackModule, BannerModule],
})
export class CoreModule {}
