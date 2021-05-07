import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelinePageComponent } from './timeline-page.component';
import { WorkViewModule } from '../../features/work-view/work-view.module';
import { TimelineModule } from '../../features/timeline/timeline.module';

@NgModule({
  declarations: [TimelinePageComponent],
  imports: [CommonModule, WorkViewModule, TimelineModule],
})
export class TimelinePageModule {}
