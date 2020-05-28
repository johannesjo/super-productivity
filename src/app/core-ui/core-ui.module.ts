import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LayoutModule} from './layout/layout.module';
import {MainHeaderModule} from './main-header/main-header.module';
import {ShortcutModule} from './shortcut/shortcut.module';
import {SideNavModule} from './side-nav/side-nav.module';

@NgModule({
  imports: [
    CommonModule,
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
    SideNavModule,
  ],
  exports: [
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
    SideNavModule,
  ],
})
export class CoreUiModule {
}
