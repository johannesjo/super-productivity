import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from './layout/layout.module';
import { MainHeaderModule } from './main-header/main-header.module';
import { ShortcutModule } from './shortcut/shortcut.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
  ],
  exports:[
    LayoutModule,
    MainHeaderModule,
    ShortcutModule,
  ]
})
export class CoreUiModule { }
