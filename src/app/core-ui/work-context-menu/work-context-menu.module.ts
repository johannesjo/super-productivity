import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkContextMenuComponent } from './work-context-menu.component';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [WorkContextMenuComponent],
  imports: [UiModule, CommonModule, RouterModule],
  exports: [WorkContextMenuComponent],
})
export class WorkContextMenuModule {}
