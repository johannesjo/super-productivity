import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduledListPageComponent } from './scheduled-list-page.component';
import { UiModule } from '../../ui/ui.module';
import { TagModule } from '../../features/tag/tag.module';
import { InlineMultilineInputComponent } from '../../ui/inline-multiline-input/inline-multiline-input.component';
import { PlannerModule } from '../../features/planner/planner.module';
import { TasksModule } from '../../features/tasks/tasks.module';

@NgModule({
  declarations: [ScheduledListPageComponent],
  imports: [
    CommonModule,
    UiModule,
    TagModule,
    InlineMultilineInputComponent,
    PlannerModule,
    TasksModule,
  ],
  exports: [ScheduledListPageComponent],
})
export class ScheduledListPageModule {}
