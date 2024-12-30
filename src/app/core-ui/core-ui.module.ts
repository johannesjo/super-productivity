import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainHeaderModule } from './main-header/main-header.module';
import { ShortcutModule } from './shortcut/shortcut.module';
import { SideNavModule } from './side-nav/side-nav.module';
import { GlobalProgressBarModule } from './global-progress-bar/global-progress-bar.module';

@NgModule({
  imports: [
    CommonModule,
    MainHeaderModule,
    ShortcutModule,
    SideNavModule,
    GlobalProgressBarModule,
  ],
  exports: [MainHeaderModule, ShortcutModule, SideNavModule, GlobalProgressBarModule],
})
export class CoreUiModule {}
