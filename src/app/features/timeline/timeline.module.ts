import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { TasksModule } from '../tasks/tasks.module';
import { UiModule } from '../../ui/ui.module';
import { TimelineCustomEventComponent } from './timeline-custom-event/timeline-custom-event.component';

@NgModule({
  declarations: [TimelineComponent, TimelineCustomEventComponent],
  exports: [TimelineComponent],
  imports: [CommonModule, UiModule, TasksModule],
})
export class TimelineModule {}
