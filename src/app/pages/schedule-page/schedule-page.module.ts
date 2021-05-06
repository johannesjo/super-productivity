import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchedulePageComponent } from './schedule-page.component';
import { UiModule } from '../../ui/ui.module';
import { TagModule } from '../../features/tag/tag.module';

@NgModule({
  declarations: [SchedulePageComponent],
  imports: [CommonModule, UiModule, TagModule],
  exports: [SchedulePageComponent],
})
export class SchedulePageModule {}
