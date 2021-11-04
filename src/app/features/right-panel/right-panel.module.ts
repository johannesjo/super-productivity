import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RightPanelComponent } from './right-panel.component';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../tasks/tasks.module';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';

@NgModule({
  declarations: [RightPanelComponent],
  imports: [CommonModule, UiModule, TasksModule, BetterDrawerModule],
  exports: [RightPanelComponent],
})
export class RightPanelModule {}
