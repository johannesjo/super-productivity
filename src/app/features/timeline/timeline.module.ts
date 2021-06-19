import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { TasksModule } from '../tasks/tasks.module';
import { UiModule } from '../../ui/ui.module';
import { TimelineRepeatTaskProjectionComponent } from './timeline-repeat-task-projection/timeline-repeat-task-projection.component';
import { DialogTimelineInitialSetupComponent } from './dialog-timeline-initial-setup/dialog-timeline-initial-setup.component';
import { TimelineCustomEventComponent } from './timeline-custom-event/timeline-custom-event.component';

@NgModule({
  declarations: [
    TimelineComponent,
    TimelineCustomEventComponent,
    TimelineRepeatTaskProjectionComponent,
    DialogTimelineInitialSetupComponent,
  ],
  exports: [TimelineComponent],
  imports: [CommonModule, UiModule, TasksModule],
})
export class TimelineModule {}
