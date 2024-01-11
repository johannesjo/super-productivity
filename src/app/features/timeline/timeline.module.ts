import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { TasksModule } from '../tasks/tasks.module';
import { UiModule } from '../../ui/ui.module';
import { TimelineRepeatTaskProjectionComponent } from './timeline-repeat-task-projection/timeline-repeat-task-projection.component';
import { DialogTimelineSetupComponent } from './dialog-timeline-setup/dialog-timeline-setup.component';
import { TimelineCustomEventComponent } from './timeline-custom-event/timeline-custom-event.component';
import { TimelineCalendarEventComponent } from './timeline-calendar-event/timeline-calendar-event.component';
import { RightPanelModule } from '../right-panel/right-panel.module';

@NgModule({
  declarations: [
    TimelineComponent,
    TimelineCustomEventComponent,
    TimelineRepeatTaskProjectionComponent,
    TimelineCalendarEventComponent,
    DialogTimelineSetupComponent,
  ],
  exports: [TimelineComponent],
  imports: [CommonModule, UiModule, TasksModule, RightPanelModule],
})
export class TimelineModule {}
