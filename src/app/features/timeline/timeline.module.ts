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
import { TimelineDaysComponent } from './timeline-days/timeline-days.component';
import { TimelineDayComponent } from './timeline-day/timeline-day.component';
import { PlannerModule } from '../planner/planner.module';

@NgModule({
  declarations: [
    TimelineComponent,
    TimelineCustomEventComponent,
    TimelineRepeatTaskProjectionComponent,
    TimelineCalendarEventComponent,
    TimelineDaysComponent,
    TimelineDayComponent,
    DialogTimelineSetupComponent,
  ],
  exports: [TimelineComponent, TimelineDaysComponent],
  imports: [CommonModule, UiModule, TasksModule, RightPanelModule, PlannerModule],
})
export class TimelineModule {}
