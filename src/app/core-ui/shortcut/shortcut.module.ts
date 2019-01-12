import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ShortcutService } from './shortcut.service';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
  ],
  declarations: [],
  providers: [ShortcutService]

})
export class ShortcutModule {
}
