import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchedulePageComponent } from './schedule-page.component';
import { UiModule } from '../../ui/ui.module';
import { TagModule } from '../../features/tag/tag.module';
import { InlineMultilineInputComponent } from '../../ui/inline-multiline-input/inline-multiline-input.component';

@NgModule({
  declarations: [SchedulePageComponent],
  imports: [CommonModule, UiModule, TagModule, InlineMultilineInputComponent],
  exports: [SchedulePageComponent],
})
export class SchedulePageModule {}
