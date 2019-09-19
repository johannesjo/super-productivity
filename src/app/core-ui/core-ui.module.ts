import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LayoutModule} from './layout/layout.module';
import {MainHeaderModule} from './main-header/main-header.module';
import {ShortcutModule} from './shortcut/shortcut.module';
import {ProjectListModule} from './project-list/project-list.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
    ProjectListModule,
  ],
  exports: [
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
    ProjectListModule,
  ],
})
export class CoreUiModule {
}
